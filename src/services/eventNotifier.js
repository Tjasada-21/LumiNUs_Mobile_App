import supabase from './supabase';
import { sendPushNotification } from './NotificationSender';

let pollTimer = null;
let isInitialized = false;
let lastSeenEventCreatedAt = null;
let lastSeenEventIds = new Set();

const cleanupEvents = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  isInitialized = false;
};

const sendEventNotification = async (event) => {
  try {
    const { data: alumniRows, error: alumniError } = await supabase
      .from('alumnis')
      .select('push_token')
      .not('push_token', 'is', null);

    if (alumniError || !Array.isArray(alumniRows) || alumniRows.length === 0) {
      return;
    }

    const tokens = alumniRows
      .map((row) => row.push_token)
      .filter(Boolean);

    if (tokens.length === 0) {
      return;
    }

    const title = event.title || 'New Event';
    const body = event.description || 'Check out the latest event.';

    // Try to fetch a representative image for the event
    let imageUrl = null;
    try {
      const { data: imgRows, error: imgErr } = await supabase
        .from('images_events')
        .select('image_path')
        .eq('event_id', event.id)
        .limit(1);

      if (!imgErr && Array.isArray(imgRows) && imgRows.length > 0) {
        imageUrl = imgRows[0].image_path || null;
      }

      // If image path is a storage path (not a full URL), try to convert to a public URL
      if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
        try {
          const { data: publicUrlData } = await supabase.storage
            .from('luminus_assets')
            .getPublicUrl(imageUrl);
          if (publicUrlData && publicUrlData.publicUrl) {
            imageUrl = publicUrlData.publicUrl;
          }
        } catch (err) {
          // ignore storage conversion errors
        }
      }
    } catch (err) {
      // ignore image fetch errors
    }

    await sendPushNotification(
      tokens,
      `🎉 ${title}`,
      body.substring(0, 150),
      {
        type: 'event',
        eventId: event.id,
        screen: 'Home',
        targetScreen: 'EventsScreen',
        image: imageUrl,
      }
    );
  } catch (error) {
    // Silently handle notification errors
  }
};

const getLatestEventMarker = (row) => {
  const createdAt = row?.created_at ? new Date(row.created_at).getTime() : 0;
  return Number.isFinite(createdAt) ? createdAt : 0;
};

const pollForNewEvents = async () => {
  try {
    const query = supabase
      .from('events')
      .select('id, title, description, created_at')
      .order('created_at', { ascending: true })
      .limit(50);

    const { data, error } = lastSeenEventCreatedAt
      ? await query.gt('created_at', new Date(lastSeenEventCreatedAt).toISOString())
      : await query;

    if (error || !Array.isArray(data) || data.length === 0) {
      return;
    }

    const newRows = data.filter((row) => {
      const marker = getLatestEventMarker(row);
      const seenBefore = lastSeenEventIds.has(String(row.id));

      if (seenBefore) {
        return false;
      }

      if (!lastSeenEventCreatedAt) {
        return false;
      }

      return marker > lastSeenEventCreatedAt;
    });

    for (const row of newRows) {
      await sendEventNotification(row);
      lastSeenEventIds.add(String(row.id));
      const marker = getLatestEventMarker(row);
      if (!lastSeenEventCreatedAt || marker > lastSeenEventCreatedAt) {
        lastSeenEventCreatedAt = marker;
      }
    }

    const latestRow = data[data.length - 1];
    if (latestRow) {
      const latestMarker = getLatestEventMarker(latestRow);
      if (!lastSeenEventCreatedAt || latestMarker > lastSeenEventCreatedAt) {
        lastSeenEventCreatedAt = latestMarker;
      }
    }

    if (lastSeenEventIds.size > 200) {
      lastSeenEventIds = new Set(Array.from(lastSeenEventIds).slice(-100));
    }
  } catch (error) {
    // Silently handle polling errors
  }
};

export const startEventNotifier = async () => {
  if (isInitialized) {
    return cleanupEvents;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      lastSeenEventCreatedAt = getLatestEventMarker(data[0]);
    }

    await pollForNewEvents();

    pollTimer = setInterval(() => {
      pollForNewEvents();
    }, 30000);

    isInitialized = true;
  } catch (error) {
    // Silently handle initialization errors
  }

  return cleanupEvents;
};