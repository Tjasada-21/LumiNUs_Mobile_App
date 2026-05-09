import supabase from './supabase';

/**
 * Connections & Followers Queries
 */

/**
 * Get user's followers
 */
export const getFollowers = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        *,
        follower:follower_alumni_id(id, first_name, last_name, email, alumni_photo, program)
      `)
      .eq('followed_alumni_id', alumniId)
      .eq('status', 1); // 1 = connected

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[followers] Get followers error:', error.message);
    throw error;
  }
};

/**
 * Get users that alumni is following
 */
export const getFollowing = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        *,
        followed:followed_alumni_id(id, first_name, last_name, email, alumni_photo, program)
      `)
      .eq('follower_alumni_id', alumniId)
      .eq('status', 1); // 1 = connected

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[followers] Get following error:', error.message);
    throw error;
  }
};

/**
 * Get pending connection requests received by alumni (others sent to me)
 */
export const getPendingFollowRequests = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        *,
        follower:follower_alumni_id(id, first_name, last_name, email, alumni_photo)
      `)
      .eq('followed_alumni_id', alumniId)
      .eq('status', 0); // 0 = pending

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[followers] Get pending requests error:', error.message);
    throw error;
  }
};

/**
 * Get pending connection requests sent by alumni (I sent, not yet accepted)
 */
export const getSentPendingRequests = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        *,
        followed:followed_alumni_id(id, first_name, last_name, email, alumni_photo, program)
      `)
      .eq('follower_alumni_id', alumniId)
      .eq('status', 0); // 0 = pending

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[followers] Get sent pending requests error:', error.message);
    throw error;
  }
};

/**
 * Send follow request
 */
export const sendFollowRequest = async (fromAlumniId, toAlumniId) => {
  try {
    // Check if already following or request exists
    const { data: existingData } = await supabase
      .from('followers')
      .select('id, status')
      .eq('follower_alumni_id', fromAlumniId)
      .eq('followed_alumni_id', toAlumniId)
      .single();

    if (existingData) {
      return existingData;
    }

    const { data, error } = await supabase
      .from('followers')
      .insert([{
        follower_alumni_id: fromAlumniId,
        followed_alumni_id: toAlumniId,
        status: 0, // pending
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[followers] Send request error:', error.message);
    throw error;
  }
};

/**
 * Accept follow request
 */
export const acceptFollowRequest = async (followerId, followedId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .update({ status: 1 }) // 1 = connected
      .eq('follower_alumni_id', followerId)
      .eq('followed_alumni_id', followedId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[followers] Accept request error:', error.message);
    throw error;
  }
};

/**
 * Reject follow request
 */
export const rejectFollowRequest = async (followerId, followedId) => {
  try {
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_alumni_id', followerId)
      .eq('followed_alumni_id', followedId);

    if (error) throw error;
  } catch (error) {
    console.error('[followers] Reject request error:', error.message);
    throw error;
  }
};

/**
 * Unfollow user
 */
export const unfollowUser = async (fromAlumniId, toAlumniId) => {
  try {
    const { error } = await supabase
      .from('followers')
      .update({ status: 2 }) // 2 = deleted/unfollowed
      .eq('follower_alumni_id', fromAlumniId)
      .eq('followed_alumni_id', toAlumniId);

    if (error) throw error;
  } catch (error) {
    console.error('[followers] Unfollow error:', error.message);
    throw error;
  }
};

/**
 * Check follow status between two users
 */
export const getFollowStatus = async (fromAlumniId, toAlumniId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('status')
      .eq('follower_alumni_id', fromAlumniId)
      .eq('followed_alumni_id', toAlumniId)
      .single();

    if (error && error.code === 'PGRST116') {
      return null; // No relationship
    }

    if (error) throw error;
    return data?.status || null;
  } catch (error) {
    console.error('[followers] Get status error:', error.message);
    throw error;
  }
};

/**
 * Get follower count
 */
export const getFollowerCount = async (alumniId) => {
  try {
    const { count, error } = await supabase
      .from('followers')
      .select('*', { count: 'exact' })
      .eq('followed_alumni_id', alumniId)
      .eq('status', 1); // only count connected followers

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[followers] Get count error:', error.message);
    throw error;
  }
};

/**
 * Get following count
 */
export const getFollowingCount = async (alumniId) => {
  try {
    const { count, error } = await supabase
      .from('followers')
      .select('*', { count: 'exact' })
      .eq('follower_alumni_id', alumniId)
      .eq('status', 1); // only count connected following

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[followers] Following count error:', error.message);
    throw error;
  }
};
