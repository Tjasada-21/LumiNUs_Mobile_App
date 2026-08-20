/**
 * Image URI Utilities
 * Handles conversion of relative Supabase paths to full public URLs
 */

// 🚀 THE FIX: Use environment variables instead of hardcoded URLs
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) {
  console.warn(
    "WARNING: EXPO_PUBLIC_SUPABASE_URL is missing from your environment variables. Image utilities may not resolve URLs correctly."
  );
}

const LUMINUS_ASSETS_BUCKET = "luminus_assets";
const EVENT_IMAGES_FOLDER = "events_images";
const PERK_IMAGES_FOLDER = "perks_images";
const ANNOUNCEMENT_IMAGE_FOLDERS = [
  "announcements_images",
  "announcement_images",
];

/**
 * Extracts initials from a display name for fallback avatars.
 * Use this directly with your <AvatarInitials /> component!
 */
export const getAvatarInitials = (name) => {
  const rawName = String(name || "User").trim();
  if (!rawName) {
    return "U";
  }

  const parts = rawName.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  return initials || rawName.charAt(0).toUpperCase() || "U";
};

/**
 * Normalize an image URI from the luminus_assets bucket
 * Converts relative paths to full Supabase public URLs
 * @param {string} uri - The image URI (can be relative path or full URL)
 * @returns {string} Full Supabase public URL or original URL if already absolute
 */
export const normalizeLuminusImageUri = (uri) => {
  if (!uri) {
    return "";
  }

  const uriString = String(uri);

  // If it's already a full HTTPS URL, return as-is
  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  // It's a relative path - construct the full Supabase public URL
  const cleanPath = uriString.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${LUMINUS_ASSETS_BUCKET}/${cleanPath}`;
};

/**
 * Get a normalized avatar URI.
 * Returns an empty string if no valid photoUri is provided, gracefully 
 * falling back to your native <AvatarInitials /> component in the UI.
 * @param {string} _name - User's display name (kept for backwards compatibility)
 * @param {string} photoUri - The photo URI from alumni_photo field
 * @returns {string} Full URI for image source or empty string
 */
export const getAvatarUri = (_name, photoUri) => {
  if (photoUri && typeof photoUri === 'string' && photoUri.trim() !== '') {
    return normalizeLuminusImageUri(photoUri);
  }
  return ""; 
};

/**
 * Normalize an event image URI from the events_images folder in luminus_assets
 */
export const normalizeEventImageUri = (uri) => {
  if (!uri) {
    return "";
  }

  const uriString = String(uri);

  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  const cleanPath = uriString.replace(/^\/+/, "");
  const prefixedPath = cleanPath.startsWith(`${EVENT_IMAGES_FOLDER}/`)
    ? cleanPath
    : `${EVENT_IMAGES_FOLDER}/${cleanPath}`;

  return `${SUPABASE_URL}/storage/v1/object/public/${LUMINUS_ASSETS_BUCKET}/${prefixedPath}`;
};

/**
 * Normalize a perk image URI from the perks_images folder in luminus_assets
 */
export const normalizePerkImageUri = (uri) => {
  if (!uri) {
    return "";
  }

  const uriString = String(uri);

  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  // Support mixed formats from API responses:
  const cleanPath = uriString.trim().replace(/\\/g, "/").replace(/^\/+/, "");

  const withoutStoragePrefix = cleanPath
    .replace(/^storage\/v1\/object\/public\//i, "")
    .replace(/^public\//i, "");

  const withoutBucketPrefix = withoutStoragePrefix.startsWith(
    `${LUMINUS_ASSETS_BUCKET}/`,
  )
    ? withoutStoragePrefix.slice(`${LUMINUS_ASSETS_BUCKET}/`.length)
    : withoutStoragePrefix;

  const prefixedPath = withoutBucketPrefix.startsWith(`${PERK_IMAGES_FOLDER}/`)
    ? withoutBucketPrefix
    : `${PERK_IMAGES_FOLDER}/${withoutBucketPrefix}`;

  return `${SUPABASE_URL}/storage/v1/object/public/${LUMINUS_ASSETS_BUCKET}/${prefixedPath}`;
};

/**
 * Normalize an announcement image URI from the announcement image folders in luminus_assets
 */
export const normalizeAnnouncementImageUri = (uri) => {
  if (!uri) {
    return "";
  }

  const uriString = String(uri);

  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  const cleanPath = uriString.replace(/^\/+/, "");
  const hasKnownPrefix = ANNOUNCEMENT_IMAGE_FOLDERS.some((folder) =>
    cleanPath.startsWith(`${folder}/`),
  );
  const prefixedPath = hasKnownPrefix
    ? cleanPath
    : `announcements_images/${cleanPath}`;

  return `${SUPABASE_URL}/storage/v1/object/public/${LUMINUS_ASSETS_BUCKET}/${prefixedPath}`;
};