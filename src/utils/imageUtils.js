/**
 * Image URI Utilities
 * Handles conversion of relative Supabase paths to full public URLs
 */

const SUPABASE_URL = 'https://pmnirrvwibzqjlutbnwz.supabase.co';
const LUMINUS_ASSETS_BUCKET = 'luminus_assets';
const EVENT_IMAGES_FOLDER = 'events_images';
const PERK_IMAGES_FOLDER = 'perks_images';
const ANNOUNCEMENT_IMAGE_FOLDERS = ['announcements_images', 'announcement_images'];

/**
 * Normalize an image URI from the luminus_assets bucket
 * Converts relative paths to full Supabase public URLs
 * @param {string} uri - The image URI (can be relative path or full URL)
 * @returns {string} Full Supabase public URL or original URL if already absolute
 */
export const normalizeLuminusImageUri = (uri) => {
  if (!uri) {
    return '';
  }

  const uriString = String(uri);

  // If it's already a full HTTPS URL, return as-is
  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  // It's a relative path - construct the full Supabase public URL
  const cleanPath = uriString.replace(/^\/+/, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${LUMINUS_ASSETS_BUCKET}/${cleanPath}`;
};

/**
 * Get a normalized avatar URI, with fallback to generated avatar
 * @param {string} name - User's display name for avatar generation
 * @param {string} photoUri - The photo URI from alumni_photo field
 * @returns {string} Full URI for image source
 */
export const getAvatarUri = (name, photoUri) => {
  if (photoUri) {
    return normalizeLuminusImageUri(photoUri);
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=31429B&color=fff`;
};

/**
 * Normalize an event image URI from the events_images folder in luminus_assets
 */
export const normalizeEventImageUri = (uri) => {
  if (!uri) {
    return '';
  }

  const uriString = String(uri);

  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  const cleanPath = uriString.replace(/^\/+/, '');
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
    return '';
  }

  const uriString = String(uri);

  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  // Support mixed formats from API responses:
  // - perks_images/file.jpg
  // - luminus_assets/perks_images/file.jpg
  // - storage/v1/object/public/luminus_assets/perks_images/file.jpg
  const cleanPath = uriString
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  const withoutStoragePrefix = cleanPath
    .replace(/^storage\/v1\/object\/public\//i, '')
    .replace(/^public\//i, '');

  const withoutBucketPrefix = withoutStoragePrefix.startsWith(`${LUMINUS_ASSETS_BUCKET}/`)
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
    return '';
  }

  const uriString = String(uri);

  if (/^https?:\/\//i.test(uriString)) {
    return uriString;
  }

  const cleanPath = uriString.replace(/^\/+/, '');
  const hasKnownPrefix = ANNOUNCEMENT_IMAGE_FOLDERS.some((folder) => cleanPath.startsWith(`${folder}/`));
  const prefixedPath = hasKnownPrefix ? cleanPath : `announcements_images/${cleanPath}`;

  return `${SUPABASE_URL}/storage/v1/object/public/${LUMINUS_ASSETS_BUCKET}/${prefixedPath}`;
};
