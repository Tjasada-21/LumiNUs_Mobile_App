import supabase from "./supabase";
import { sendPushNotification } from "./NotificationSender";

let pollTimer = null;
let isInitialized = false;
let lastSeenAnnouncementCreatedAt = null;
let lastSeenAnnouncementIds = new Set();

const cleanupAnnouncements = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  isInitialized = false;
};

const sendAnnouncementNotification = async (announcement) => {
  try {
    const { data: alumniRows, error: alumniError } = await supabase
      .from("alumnis")
      .select("push_token")
      .not("push_token", "is", null);

    if (alumniError || !Array.isArray(alumniRows) || alumniRows.length === 0) {
      return;
    }

    const tokens = alumniRows.map((row) => row.push_token).filter(Boolean);

    if (tokens.length === 0) {
      return;
    }

    const title = announcement.title || "New Announcement";
    const body =
      announcement.announcement_description ||
      "Check out the latest announcement.";

    // Try to fetch a representative image for the announcement
    let imageUrl = null;
    try {
      const { data: imgRows, error: imgErr } = await supabase
        .from("images_announcements")
        .select("image_path")
        .eq("announcement_id", announcement.id)
        .limit(1);

      if (!imgErr && Array.isArray(imgRows) && imgRows.length > 0) {
        imageUrl = imgRows[0].image_path || null;
      }

      // If image path is a storage path (not a full URL), try to convert to a public URL
      if (
        imageUrl &&
        typeof imageUrl === "string" &&
        !imageUrl.startsWith("http")
      ) {
        try {
          const { data: publicUrlData } = await supabase.storage
            .from("luminus_assets")
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

    await sendPushNotification(tokens, title, body.substring(0, 150), {
      type: "announcement",
      announcementId: announcement.id,
      screen: "Home",
      targetScreen: "Feed",
      image: imageUrl,
    });
  } catch (error) {
    // Silently handle notification errors
  }
};

const getLatestAnnouncementMarker = (row) => {
  const createdAt = row?.created_at ? new Date(row.created_at).getTime() : 0;
  return Number.isFinite(createdAt) ? createdAt : 0;
};

const pollForNewAnnouncements = async () => {
  try {
    const query = supabase
      .from("announcements")
      .select("id, title, announcement_description, created_at")
      .order("created_at", { ascending: true })
      .limit(50);

    const { data, error } = lastSeenAnnouncementCreatedAt
      ? await query.gt(
          "created_at",
          new Date(lastSeenAnnouncementCreatedAt).toISOString(),
        )
      : await query;

    if (error || !Array.isArray(data) || data.length === 0) {
      return;
    }

    const newRows = data.filter((row) => {
      const marker = getLatestAnnouncementMarker(row);
      const seenBefore = lastSeenAnnouncementIds.has(String(row.id));

      if (seenBefore) {
        return false;
      }

      if (!lastSeenAnnouncementCreatedAt) {
        return false;
      }

      return marker > lastSeenAnnouncementCreatedAt;
    });

    for (const row of newRows) {
      await sendAnnouncementNotification(row);
      lastSeenAnnouncementIds.add(String(row.id));
      const marker = getLatestAnnouncementMarker(row);
      if (
        !lastSeenAnnouncementCreatedAt ||
        marker > lastSeenAnnouncementCreatedAt
      ) {
        lastSeenAnnouncementCreatedAt = marker;
      }
    }

    const latestRow = data[data.length - 1];
    if (latestRow) {
      const latestMarker = getLatestAnnouncementMarker(latestRow);
      if (
        !lastSeenAnnouncementCreatedAt ||
        latestMarker > lastSeenAnnouncementCreatedAt
      ) {
        lastSeenAnnouncementCreatedAt = latestMarker;
      }
    }

    if (lastSeenAnnouncementIds.size > 200) {
      lastSeenAnnouncementIds = new Set(
        Array.from(lastSeenAnnouncementIds).slice(-100),
      );
    }
  } catch (error) {
    // Silently handle polling errors
  }
};

export const startAnnouncementNotifier = async () => {
  if (isInitialized) {
    return cleanupAnnouncements;
  }

  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      lastSeenAnnouncementCreatedAt = getLatestAnnouncementMarker(data[0]);
    }

    await pollForNewAnnouncements();

    pollTimer = setInterval(() => {
      pollForNewAnnouncements();
    }, 30000);

    isInitialized = true;
  } catch (error) {
    // Silently handle initialization errors
  }

  return cleanupAnnouncements;
};
