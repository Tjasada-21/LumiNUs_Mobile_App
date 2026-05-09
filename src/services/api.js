// Compatibility shim for legacy `api` usage.
// Routes common REST-like calls to Supabase query helpers so older imports keep working.
import supabase from './supabase';
import { getCurrentUser } from './supabaseAuth';
import {
  getAlumniProfile,
  getAlumniByEmail,
  searchAlumni,
} from './alumniQueries';
import {
  getFeedPosts,
  getUserPosts,
  getPostById,
  createPost,
  updatePost,
  addComment,
} from './postQueries';
import {
  getAllEvents,
  getEventById,
  getUserEventRegistrations,
  cancelEventRegistration,
} from './eventQueries';
import {
  getConversations,
  getDirectMessages,
} from './messageQueries';
import {
  getFollowing,
  getFollowers,
  sendFollowRequest,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
} from './connectionQueries';
import { dismissNotification } from './utilityQueries';

const normalizePath = (p) => String(p || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');

const normalizeComment = (comment) => {
  if (!comment) {
    return comment;
  }

  const { alumnis, alumni, ...rest } = comment;

  return {
    ...rest,
    alumni: alumni ?? alumnis ?? null,
  };
};

const getCurrentAlumni = async () => {
  return await getCurrentUser().catch(() => null);
};

const api = {
  applyBaseUrlOverride: async () => {},
  apiReady: Promise.resolve(),
  get: async (path, config = {}) => {
    const p = normalizePath(path);

    // users
    if (p === 'user' || p === 'user/profile' || p === 'alumni/profile') {
      const alumni = await getCurrentAlumni();
      return { data: alumni };
    }

    // alumni by id
    if (/^alumni\/\d+$/.test(p) || /^alumnis\/\d+$/.test(p)) {
      const id = p.split('/').pop();
      const profile = await getAlumniProfile(id);
      return { data: profile };
    }

    // search alumni
    if (p.startsWith('alumni/search') || p.startsWith('alumnis/search')) {
      const q = (config?.params?.q) || '';
      const results = await searchAlumni(q);
      return { data: results };
    }

    // events
    if (p === 'events' || p === 'events/') {
      const events = await getAllEvents();
      return { data: events };
    }

    if (/^events\/[0-9]+$/.test(p)) {
      const id = p.split('/').pop();
      const ev = await getEventById(id);
      return { data: ev };
    }

    // event registrations
    if (p === 'event-registrations' || p === 'registrations') {
      const alumni = await getCurrentAlumni();
      if (!alumni) return { data: { registrations: [] } };
      const regs = await getUserEventRegistrations(alumni.id);
      return { data: { registrations: regs } };
    }

    // perks
    if (p === 'perks') {
      const { data, error } = await supabase
        .from('perks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: { perks: [] } };
      return { data: { perks: data ?? [] } };
    }

    // posts / feed
    if (p === 'posts' || p === 'feed') {
      const alumni = await getCurrentAlumni();
      const posts = await getFeedPosts(alumni?.id ?? null);
      return { data: posts };
    }

    if (/^posts\/[0-9]+$/.test(p)) {
      const id = p.split('/').pop();
      const post = await getPostById(id);
      return { data: post };
    }

    if (/^posts\/[0-9]+\/comments$/.test(p)) {
      const postId = p.split('/')[1];
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          alumnis:alumni_id(id, first_name, last_name, email, alumni_photo)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: { comments: (data ?? []).map(normalizeComment) } };
    }

    // followers / following
    if (p === 'followers') {
      const alumni = await getCurrentAlumni();
      const followers = await getFollowers(alumni?.id);
      return { data: followers };
    }

    if (p === 'following' || p === 'contacts') {
      const alumni = await getCurrentAlumni();
      const following = await getFollowing(alumni?.id);
      return { data: following };
    }

    // conversations / messages
    if (p === 'conversations' || p === 'messages/conversations') {
      const alumni = await getCurrentAlumni();
      const convos = await getConversations(alumni?.id);
      return { data: convos };
    }

    if (p.startsWith('messages')) {
      // /messages?userId=xx
      const alumni = await getCurrentAlumni();
      const otherId = config?.params?.userId ?? null;
      const msgs = await getDirectMessages(alumni?.id, otherId);
      return { data: msgs };
    }

    // notifications
    if (p === 'notifications') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return { data: { notifications: [] } };
      return { data: { notifications: data ?? [] } };
    }

    console.warn('[api shim] Unhandled GET path:', p);
    return { data: null };
  },

  post: async (path, body = {}, config = {}) => {
    const p = normalizePath(path);

    // follow
    if (/^alumni\/\d+\/follow$/.test(p) || /^alumnis\/\d+\/follow$/.test(p)) {
      const targetId = p.split('/')[1];
      const alumni = await getCurrentAlumni();
      const resp = await sendFollowRequest(alumni?.id, Number(targetId));
      return { data: resp };
    }

    // create post
    if (p === 'posts' || p === 'create-post') {
      const alumni = await getCurrentAlumni();
      const post = await createPost(alumni?.id, body);
      return { data: post };
    }

    if (/^posts\/[0-9]+\/comments$/.test(p)) {
      const postId = Number(p.split('/')[1]);
      const alumni = await getCurrentAlumni();

      if (!alumni?.id) {
        throw new Error('No active session found.');
      }

      const commentText = String(body?.comment ?? body?.content ?? '').trim();
      if (!commentText) {
        throw new Error('Comment text is required.');
      }

      const savedComment = await addComment(postId, alumni.id, commentText, body?.parent_id ?? null);
      return { data: { comment: normalizeComment(savedComment) } };
    }

    if (p === 'forgot-password') {
      const email = String(body?.email || '').trim();
      if (!email) return { data: { message: 'Email is required.' } };

      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      return { data: { message: 'Check your email for password reset instructions.' } };
    }

    if (p === 'alumni/reset-password') {
      const nextPassword = String(body?.password || '');
      if (!nextPassword) return { data: { message: 'Password is required.' } };

      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;

      return { data: { message: 'Your password has been updated successfully.' } };
    }

    if (p === 'notifications/register-device') {
      const pushToken = String(body?.push_token || '').trim();
      if (!pushToken) {
        return { data: { message: 'Push token is required.' } };
      }

      return { data: { message: 'ok' } };
    }

    if (/^followers\/[^/]+\/accept$/.test(p)) {
      const alumni = await getCurrentAlumni();
      const requestId = Number(p.split('/')[1]);

      if (!alumni?.id || !Number.isFinite(requestId)) {
        throw new Error('Unable to accept follow request.');
      }

      const result = await acceptFollowRequest(requestId, alumni.id);
      return { data: result };
    }

    if (/^contacts\/[^/]+\/favorite$/.test(p) || /^group-chats\/[^/]+\/(archive|ignore|mute|mark-unread|leave)$/.test(p)) {
      return { data: { message: 'ok' } };
    }

    // create group chat
    if (p === 'group-chats' || p === 'group_chats') {
      // try to call a minimal create via messages module if available
      console.warn('[api shim] group chat creation not implemented in shim');
      return { data: null };
    }

    if (/^group-chats\/[^/]+$/.test(p)) {
      return { data: { message: 'ok' } };
    }

    console.warn('[api shim] Unhandled POST path:', p);
    return { data: null };
  },

  patch: async (path, body = {}, config = {}) => {
    const p = normalizePath(path);

    if (/^posts\/[0-9]+$/.test(p)) {
      const id = p.split('/').pop();
      const updated = await updatePost(id, body);
      return { data: updated };
    }

    console.warn('[api shim] Unhandled PATCH path:', p);
    return { data: null };
  },

  delete: async (path, config = {}) => {
    const p = normalizePath(path);

    if (/^alumni\/\d+\/follow$/.test(p)) {
      const targetId = p.split('/')[1];
      const alumni = await getCurrentAlumni();
      await unfollowUser(alumni?.id, Number(targetId));
      return { data: null };
    }

    if (/^notifications\/[^/]+$/.test(p)) {
      const alumni = await getCurrentAlumni();
      const notificationKey = decodeURIComponent(p.split('/').pop());

      if (!alumni?.id) {
        throw new Error('No active session found.');
      }

      await dismissNotification(alumni.id, notificationKey);
      return { data: { message: 'ok' } };
    }

    if (/^followers\/[^/]+$/.test(p)) {
      const alumni = await getCurrentAlumni();
      const requestId = Number(p.split('/').pop());

      if (!alumni?.id || !Number.isFinite(requestId)) {
        throw new Error('Unable to update follow request.');
      }

      await rejectFollowRequest(requestId, alumni.id);
      return { data: { message: 'ok' } };
    }

    if (/^events\/[0-9]+\/registrations$/.test(p)) {
      const alumni = await getCurrentAlumni();
      const eventId = Number(p.split('/')[1]);

      if (!alumni?.id || !Number.isFinite(eventId)) {
        throw new Error('Unable to remove event registration.');
      }

      await cancelEventRegistration(eventId, alumni.id);
      return { data: { message: 'ok' } };
    }

    console.warn('[api shim] Unhandled DELETE path:', p);
    return { data: null };
  },
};

export const applyBaseUrlOverride = api.applyBaseUrlOverride;
export const apiReady = api.apiReady;

export default api;