import supabase from './supabase';
import { normalizeEvents, normalizeEvent, normalizeEventRegistrations } from './schemaMapper';
import { sendPushNotification } from './NotificationSender';

/**
 * Events & Registrations Queries
 */

/**
 * Get all events
 */
export const getAllEvents = async (limit = 50, offset = 0) => {
  try {
    // Filter out events that ended more than 30 days ago to avoid fetching stale data
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, title, description, start_date, end_date, platform, status,
        venue:venue_id(id, name),
        images:images_events(id, image_path)
      `)
      .eq('status', 1)
      .gte('start_date', cutoff)
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      const errMsg = error.message || error.code || '';
      if (errMsg.includes('RLS') || errMsg.includes('policy')) {
        console.error('[events] ❌ RLS Policy Error - Run SUPABASE_RLS_DISABLE.sql in Supabase');
      } else if (errMsg.includes('does not exist')) {
        console.error('[events] ❌ Table does not exist - Check Supabase database schema');
      } else {
        console.error('[events] Query error:', error.code, '-', error.message);
      }
      throw error;
    }

    // if (__DEV__) console.log('[events] ✅ Query returned', data?.length || 0, 'events');
    return normalizeEvents(data || []);
  } catch (error) {
    const errMsg = error.message || String(error);
    if (errMsg.includes('RLS')) {
      console.error('[events] ❌ RLS POLICY ERROR: Row-Level Security is blocking queries. Run SUPABASE_RLS_DISABLE.sql');
    } else if (errMsg.includes('Unauthorized')) {
      console.error('[events] ❌ UNAUTHORIZED: Check that your Supabase credentials are correct');
    } else {
      console.error('[events] Get all events exception:', errMsg);
    }
    throw error;
  }
};

/**
 * Get upcoming events
 */
export const getUpcomingEvents = async (limit = 50) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        admin:admin_id(id, admin_first_name, admin_last_name, admin_email),
        venue:venue_id(*),
        images:images_events(id, image_path),
        registrations_count:event_registrations(count)
      `)
      .gte('start_date', now)
      .eq('status', 1)
      .order('start_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return normalizeEvents(data || []);
  } catch (error) {
    console.error('[events] Get upcoming events error:', error.message);
    throw error;
  }
};

/**
 * Get event by ID
 */
export const getEventById = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        admin:admin_id(id, admin_first_name, admin_last_name, admin_email),
        venue:venue_id(*),
        images:images_events(id, image_path),
        registrations:event_registrations(*)
      `)
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return normalizeEvent(data);
  } catch (error) {
    console.error('[events] Get event by ID error:', error.message);
    throw error;
  }
};

/**
 * Create event
 */
export const createEvent = async (adminId, eventData) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        admin_id: adminId,
        title: eventData.title,
        description: eventData.description,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        venue_id: eventData.venue_id,
        max_capacity: eventData.max_capacity,
        event_type: eventData.event_type || 'general',
        platform: eventData.platform,
        platform_url: eventData.platform_url,
        status: 'published',
      }])
      .select()
      .single();

    if (error) throw error;

    // Upload images if provided
    if (eventData.images && eventData.images.length > 0) {
      await Promise.all(
        eventData.images.map(imageUri => uploadEventImage(data.id, imageUri))
      );
    }

    // Send a blast notification to all alumni who have a push token
    try {
      const { data: alumniRows, error: alumniError } = await supabase
        .from('alumnis')
        .select('push_token')
        .not('push_token', 'is', null);

      if (!alumniError && Array.isArray(alumniRows) && alumniRows.length > 0) {
        const tokens = alumniRows.map(r => r.push_token).filter(Boolean);
        if (tokens.length > 0) {
          await sendPushNotification(
            tokens,
            '🚨 New Event Posted!',
            `Check out the new event: ${data.title}`,
            { type: 'event', eventId: data.id }
          );
        }
      }
    } catch (notifErr) {
      console.error('[events] Failed to send blast notifications for new event:', notifErr);
    }

    return data;
  } catch (error) {
    console.error('[events] Create event error:', error.message);
    throw error;
  }
};

/**
 * Update event
 */
export const updateEvent = async (eventId, updates) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[events] Update event error:', error.message);
    throw error;
  }
};

/**
 * Delete event
 */
export const deleteEvent = async (eventId) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  } catch (error) {
    console.error('[events] Delete event error:', error.message);
    throw error;
  }
};

/**
 * Upload event image
 */
export const uploadEventImage = async (eventId, imageUri, bucket = 'event-images') => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const fileName = `${eventId}-${Date.now()}.jpg`;
    const storageBucket = 'luminus_assets';
    const objectPath = `events_images/${eventId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .upload(objectPath, blob, { contentType: 'image/jpeg' });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(objectPath);

    // Save image record to database
    await supabase.from('images_events').insert([{
      event_id: eventId,
      image_path: publicUrlData.publicUrl,
    }]);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('[events] Upload image error:', error.message);
    throw error;
  }
};

/**
 * Get event registrations
 */
export const getEventRegistrations = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        alumni:alumni_id(id, first_name, last_name, email, alumni_photo)
      `)
      .eq('event_id', eventId)
      .order('rsvp_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[registrations] Get registrations error:', error.message);
    throw error;
  }
};

/**
 * Register for event
 */
export const registerForEvent = async (eventId, alumniId) => {
  try {
    // Check if already registered
    const { data: existingData, error: existingError } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('alumni_id', alumniId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingData) {
      return existingData;
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .insert([{
        event_id: eventId,
        alumni_id: alumniId,
        rsvp_date: new Date().toISOString().slice(0, 10),
        registration_confirmation: false,
        status: 1,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[registrations] Register error:', error.message);
    throw error;
  }
};

/**
 * Cancel event registration
 */
export const cancelEventRegistration = async (eventId, alumniId) => {
  try {
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('alumni_id', alumniId);

    if (error) throw error;
  } catch (error) {
    console.error('[registrations] Cancel registration error:', error.message);
    throw error;
  }
};

/**
 * Update registration status
 */
export const updateRegistrationStatus = async (registrationId, status) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .update({ status })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[registrations] Update status error:', error.message);
    throw error;
  }
};

/**
 * Get user's event registrations
 */
export const getUserEventRegistrations = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:event_id(
          id,
          title,
          description,
          start_date,
          end_date,
          max_capacity,
          images:images_events(id, image_path),
          admin:admin_id(id, admin_first_name, admin_last_name)
        )
      `)
      .eq('alumni_id', alumniId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return normalizeEventRegistrations(data || []);
  } catch (error) {
    console.error('[registrations] Get user registrations error:', error.message);
    throw error;
  }
};

/**
 * Get events created by user
 */
export const getUserCreatedEvents = async (adminId) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        images:images_events(id, image_path),
        registrations_count:event_registrations(count)
      `)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[events] Get user created events error:', error.message);
    throw error;
  }
};

/**
 * Create venue
 */
export const createVenue = async (venueData) => {
  try {
    const { data, error } = await supabase
      .from('venues')
      .insert([venueData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[venues] Create venue error:', error.message);
    throw error;
  }
};

/**
 * Get all venues
 */
export const getAllVenues = async () => {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[venues] Get venues error:', error.message);
    throw error;
  }
};
