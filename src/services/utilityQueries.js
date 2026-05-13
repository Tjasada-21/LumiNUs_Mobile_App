import supabase from "./supabase";

/**
 * Notifications & Utilities
 */

/**
 * Dismiss notification
 */
export const dismissNotification = async (alumniId, notificationKey) => {
  try {
    const { data, error } = await supabase
      .from("dismissed_notifications")
      .insert([
        {
          alumni_id: alumniId,
          notification_key: notificationKey,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[notifications] Dismiss error:", error.message);
    throw error;
  }
};

/**
 * Check if notification is dismissed
 */
export const isNotificationDismissed = async (alumniId, notificationKey) => {
  try {
    const { data, error } = await supabase
      .from("dismissed_notifications")
      .select("id")
      .eq("alumni_id", alumniId)
      .eq("notification_key", notificationKey)
      .single();

    if (error && error.code === "PGRST116") {
      return false;
    }

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("[notifications] Check dismissed error:", error.message);
    throw error;
  }
};

/**
 * Get dismissed notifications
 */
export const getDismissedNotifications = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from("dismissed_notifications")
      .select("notification_key")
      .eq("alumni_id", alumniId);

    if (error) throw error;
    return (data || []).map((item) => item.notification_key);
  } catch (error) {
    console.error("[notifications] Get dismissed error:", error.message);
    throw error;
  }
};

/**
 * Setup realtime listener for posts
 */
export const subscribeToPostsUpdates = (callback) => {
  if (!supabase) {
    console.error("[realtime] Supabase not initialized");
    return null;
  }

  const subscription = supabase
    .channel("posts")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts",
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Setup realtime listener for messages
 */
export const subscribeToMessagesUpdates = (userId, callback) => {
  if (!supabase) {
    console.error("[realtime] Supabase not initialized");
    return null;
  }

  const subscription = supabase
    .channel(`messages:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Setup realtime listener for group messages
 */
export const subscribeToGroupMessagesUpdates = (groupChatId, callback) => {
  if (!supabase) {
    console.error("[realtime] Supabase not initialized");
    return null;
  }

  const subscription = supabase
    .channel(`group_messages:${groupChatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_chat_id=eq.${groupChatId}`,
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Setup realtime listener for event updates
 */
export const subscribeToEventUpdates = (eventId, callback) => {
  if (!supabase) {
    console.error("[realtime] Supabase not initialized");
    return null;
  }

  const subscription = supabase
    .channel(`events:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_registrations",
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Setup realtime listener for comments
 */
export const subscribeToCommentsUpdates = (postId, callback) => {
  if (!supabase) {
    console.error("[realtime] Supabase not initialized");
    return null;
  }

  const subscription = supabase
    .channel(`comments:${postId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `post_id=eq.${postId}`,
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Setup realtime listener for new announcements
 */
export const subscribeToAnnouncementsUpdates = (callback) => {
  if (!supabase) {
    return null;
  }

  const subscription = supabase
    .channel("announcements")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "announcements",
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Setup realtime listener for new events
 */
export const subscribeToNewEventsUpdates = (callback) => {
  if (!supabase) {
    return null;
  }

  const subscription = supabase
    .channel("new_events")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "events",
      },
      (payload) => {
        callback(payload);
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from channel
 */
export const unsubscribeFromChannel = async (subscription) => {
  if (!subscription) return;

  try {
    await supabase.removeChannel(subscription);
  } catch (error) {
    console.error("[realtime] Unsubscribe error:", error.message);
  }
};

/**
 * Batch get multiple records by IDs
 */
export const getBatchRecords = async (table, ids, selectFields = "*") => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .in("id", ids);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`[batch] Get ${table} error:`, error.message);
    throw error;
  }
};

/**
 * Get paginated data
 */
export const getPaginatedData = async (
  table,
  selectFields,
  filters,
  page = 1,
  pageSize = 20,
) => {
  try {
    const offset = (page - 1) * pageSize;

    let query = supabase.from(table).select(selectFields, { count: "exact" });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("[pagination] Get data error:", error.message);
    throw error;
  }
};

/**
 * Search across tables
 */
export const globalSearch = async (query, limit = 10) => {
  try {
    const raw = String(query ?? "").trim();
    if (!raw) return { alumni: [], posts: [], events: [] };

    const safe = raw
      .replace(/[",\{\}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!safe) return { alumni: [], posts: [], events: [] };

    const searchQuery = `%${safe}%`;

    const [alumniResults, postResults, eventResults] = await Promise.all([
      supabase
        .from("alumnis")
        .select("id, first_name, last_name, email, alumni_photo")
        .or(
          `first_name.ilike.${searchQuery}, last_name.ilike.${searchQuery}, email.ilike.${searchQuery}`,
        )
        .limit(limit),
      supabase
        .from("posts")
        .select(
          "id, caption, created_at, alumni:alumni_id(id, first_name, last_name)",
        )
        .ilike("caption", searchQuery)
        .limit(limit),
      supabase
        .from("events")
        .select("id, title, description, start_date")
        .or(`title.ilike.${searchQuery}, description.ilike.${searchQuery}`)
        .limit(limit),
    ]);

    return {
      alumni: alumniResults.data || [],
      posts: postResults.data || [],
      events: eventResults.data || [],
    };
  } catch (error) {
    console.error("[search] Global search error:", error.message);
    throw error;
  }
};
