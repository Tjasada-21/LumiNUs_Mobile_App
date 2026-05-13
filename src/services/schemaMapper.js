/**
 * Database Schema Field Mapping Utilities
 * Maps Supabase admin table columns to standard display format
 */

import { normalizeEventImageUri } from "../utils/imageUtils";

/**
 * Normalize admin object fields
 * Converts admin_first_name, admin_last_name, admin_email to standard format
 */
export const normalizeAdminFields = (admin) => {
  if (!admin) return null;

  return {
    ...admin,
    first_name: admin.admin_first_name || admin.first_name || "",
    last_name: admin.admin_last_name || admin.last_name || "",
    email: admin.admin_email || admin.email || "",
  };
};

/**
 * Normalize event object with admin fields
 */
export const normalizeEvent = (event) => {
  if (!event) return null;

  const normalizedImages = Array.isArray(event.images)
    ? event.images.map((image) => ({
        ...image,
        image_path: normalizeEventImageUri(
          image?.image_path ??
            image?.image_url ??
            image?.url ??
            image?.path ??
            "",
        ),
      }))
    : [];

  const normalizedCoverImage = normalizeEventImageUri(
    event.cover_image_url ??
      normalizedImages[0]?.image_path ??
      event.cover_image ??
      "",
  );

  return {
    ...event,
    cover_image_url: normalizedCoverImage || event.cover_image_url || null,
    images: normalizedImages,
    admin: normalizeAdminFields(event.admin),
  };
};

/**
 * Normalize array of events
 */
export const normalizeEvents = (events) => {
  return (events || []).map(normalizeEvent);
};

/**
 * Normalize tracer form with admin fields
 */
export const normalizeTracerForm = (form) => {
  if (!form) return null;

  return {
    ...form,
    admin: normalizeAdminFields(form.admin),
  };
};

/**
 * Normalize array of tracer forms
 */
export const normalizeTracerForms = (forms) => {
  return (forms || []).map(normalizeTracerForm);
};

/**
 * Normalize event registration with admin fields
 */
export const normalizeEventRegistration = (registration) => {
  if (!registration) return null;

  return {
    ...registration,
    event: registration.event ? normalizeEvent(registration.event) : null,
  };
};

/**
 * Normalize array of event registrations
 */
export const normalizeEventRegistrations = (registrations) => {
  return (registrations || []).map(normalizeEventRegistration);
};
