import supabase from './supabase';
// We no longer need resolveImageUploadBlob, as FormData handles the upload natively
// import { resolveImageUploadBlob } from './imageUploadUtils'; 
import { normalizeAnnouncementImageUri } from '../utils/imageUtils';

/**
 * Post & Feed Queries
 */

const extractCount = (value) => {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === 'object' && 'count' in first) {
      return Number(first.count) || 0;
    }
    return value.length;
  }

  if (value && typeof value === 'object' && 'count' in value) {
    return Number(value.count) || 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeComment = (comment) => {
  if (!comment) {
    return comment;
  }

  const { alumnis, alumni, ...rest } = comment;

  return {
    ...rest,
    alumni: alumni ?? alumnis ?? null,
    alumnis: alumnis ?? alumni ?? null,
  };
};

const normalizePost = (post) => {
  if (!post) {
    return post;
  }

  const { alumnis, alumni, author, images_posts, images, original_post, ...rest } = post;
  const commentCount = extractCount(post.comment_count ?? post.comments_count);
  const reactionCount = extractCount(post.reaction_count ?? post.reactions_count);
  const repostCount = extractCount(post.repost_count ?? post.reposts_count);
  const normalizedOriginalPost = original_post ? normalizePost(original_post) : null;

  return {
    ...rest,
    alumnis: alumnis ?? alumni ?? author ?? null,
    alumni: alumni ?? alumnis ?? author ?? null,
    author: author ?? alumni ?? alumnis ?? null,
    images_posts: Array.isArray(images_posts) ? images_posts : Array.isArray(images) ? images : [],
    images: Array.isArray(images) ? images : Array.isArray(images_posts) ? images_posts : [],
    original_post: normalizedOriginalPost,
    comment_count: commentCount,
    reaction_count: reactionCount,
    repost_count: repostCount,
    comments_count: commentCount,
    reactions_count: reactionCount,
    reposts_count: repostCount,
  };
};

const formatDatabaseLocalTimestamp = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const normalizeAnnouncementFeedItem = (announcement, reactionCount = 0) => {
  if (!announcement) {
    return null;
  }

  const images = Array.isArray(announcement.images)
    ? announcement.images.map((image) => ({
        ...image,
        image_url: normalizeAnnouncementImageUri(image?.image_path ?? image?.image_url ?? image?.url ?? image?.path ?? ''),
      }))
    : [];

  const author = announcement.author ?? announcement.admin ?? {};

  return {
    id: announcement.id,
    feed_id: announcement.feed_id ?? `announcement-${announcement.id}`,
    feed_type: 'announcement',
    caption: announcement.announcement_description ?? announcement.caption ?? '',
    announcement_title: announcement.announcement_title ?? announcement.title ?? '',
    announcement_description: announcement.announcement_description ?? announcement.caption ?? '',
    created_at: announcement.created_at ?? announcement.date_posted ?? null,
    author: {
      id: author.id ?? announcement.admin_id ?? null,
      first_name: author.first_name ?? announcement.admin_first_name ?? '',
      middle_name: author.middle_name ?? announcement.admin_middle_name ?? '',
      last_name: author.last_name ?? announcement.admin_last_name ?? '',
      alumni_photo: author.alumni_photo ?? announcement.admin_photo ?? null,
    },
    comment_count: 0,
    reaction_count: extractCount(reactionCount),
    repost_count: 0,
    my_reaction: null,
    my_repost: false,
    images,
  };
};

const applyUserReactions = (posts, reactions) => {
  const reactionByPostId = new Map((reactions || []).map((reaction) => [String(reaction?.post_id), reaction?.reaction ?? 'like']));

  return (posts || []).map((post) => ({
    ...post,
    my_reaction: reactionByPostId.get(String(post?.id)) ?? null,
  }));
};

/**
 * Get feed posts for user
 */
export const getFeedPosts = async (alumniId, limit = 20, offset = 0) => {
  try {
    const [postsResult, announcementsResult] = await Promise.all([
      supabase
      .from('posts')
      .select(`
        *,
        alumnis:alumni_id(id, first_name, last_name, email, alumni_photo),
        images_posts(id, image_path),
        comments_count:comments(count),
        reactions_count:reactions(count),
        reposts_count:reposts(count)
      `)
      .eq('visibility', 'public')
      .is('is_draft', false)
      .neq('moderation_status', 'rejected')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
      supabase
        .from('announcements')
        .select(`
          id,
          admin_id,
          title,
          announcement_description,
          date_posted,
          admin:admin_id(id, first_name:admin_first_name, middle_name:admin_middle_name, last_name:admin_last_name, alumni_photo:photo),
          images:images_announcements(id, image_path)
        `)
        .order('date_posted', { ascending: false })
        .range(offset, offset + limit - 1),
    ]);

    const { data: postsData, error: postsError } = postsResult;
    const { data: announcementsData, error: announcementsError } = announcementsResult;

    if (postsError) {
      console.error('[posts] Feed query error:', postsError.code || postsError.message);
      throw postsError;
    }

    if (announcementsError) {
      console.warn('[posts] Announcement feed query warning:', announcementsError.code || announcementsError.message);
    }

    const postIds = (postsData || []).map((post) => post?.id).filter(Boolean);
    const announcementIds = (announcementsData || []).map((a) => a?.id).filter(Boolean);

    const [postReactionsResult, announcementReactionsResult] = await Promise.all([
      alumniId && postIds.length > 0
        ? supabase.from('reactions').select('post_id, reaction').eq('alumni_id', alumniId).in('post_id', postIds)
        : Promise.resolve({ data: [], error: null }),
      alumniId && announcementIds.length > 0
        ? supabase.from('reactions').select('announcement_id, reaction').eq('alumni_id', alumniId).in('announcement_id', announcementIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const announcementReactionCountsResult = announcementIds.length > 0
      ? await supabase
        .from('reactions')
        .select('announcement_id')
        .in('announcement_id', announcementIds)
      : { data: [], error: null };

    if (postReactionsResult.error) {
      console.warn('[posts] User reaction lookup warning:', postReactionsResult.error.code || postReactionsResult.error.message);
    }
    if (announcementReactionsResult.error) {
      console.warn('[posts] Announcement reaction lookup warning:', announcementReactionsResult.error.code || announcementReactionsResult.error.message);
    }
    if (announcementReactionCountsResult.error) {
      console.warn('[posts] Announcement reaction count warning:', announcementReactionCountsResult.error.code || announcementReactionCountsResult.error.message);
    }

    const announcementReactionByAnnouncementId = new Map(
      (announcementReactionsResult.data || []).map((r) => [String(r?.announcement_id), r?.reaction ?? 'like'])
    );

    const announcementReactionCountById = (announcementReactionCountsResult.data || []).reduce((countMap, reaction) => {
      const announcementId = String(reaction?.announcement_id);

      if (!announcementId) {
        return countMap;
      }

      countMap.set(announcementId, (countMap.get(announcementId) ?? 0) + 1);
      return countMap;
    }, new Map());

    const normalizedPosts = applyUserReactions((postsData || []).map(normalizePost), postReactionsResult.data);
    const normalizedAnnouncements = (announcementsData || [])
      .map((announcement) => normalizeAnnouncementFeedItem(announcement, announcementReactionCountById.get(String(announcement?.id)) ?? 0))
      .filter(Boolean)
      .map((announcement) => ({
        ...announcement,
        my_reaction: announcementReactionByAnnouncementId.get(String(announcement.id)) ?? null,
      }));

    return [...normalizedPosts, ...normalizedAnnouncements]
      .sort((firstItem, secondItem) => new Date(secondItem.created_at || 0).getTime() - new Date(firstItem.created_at || 0).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('[posts] Get feed exception:', error.message || error);
    throw error;
  }
};

/**
 * Get user's own posts
 */
export const getUserPosts = async (alumniId, limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        alumnis:alumni_id(id, first_name, last_name, email, alumni_photo),
        images_posts(id, image_path),
        comments_count:comments(count),
        reactions_count:reactions(count),
        reposts_count:reposts(count)
      `)
      .eq('alumni_id', alumniId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).map(normalizePost);
  } catch (error) {
    console.error('[posts] Get user posts error:', error.message);
    throw error;
  }
};

/**
 * Get single post by ID
 */
export const getPostById = async (postId, alumniId = null) => {
  try {
    const [postResult, reactionResult] = await Promise.all([
      supabase
      .from('posts')
      .select(`
        *,
        alumnis:alumni_id(id, first_name, last_name, email, alumni_photo),
        images_posts(id, image_path),
        comments_count:comments(count),
        reactions_count:reactions(count),
        reposts_count:reposts(count)
      `)
      .eq('id', postId)
      .single(),
      alumniId
        ? supabase
            .from('reactions')
            .select('reaction')
            .eq('post_id', postId)
            .eq('alumni_id', alumniId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const { data, error } = postResult;
    const { data: userReactionData, error: userReactionError } = reactionResult;

    if (error) throw error;
    if (userReactionError) {
      console.warn('[posts] Post reaction lookup warning:', userReactionError.code || userReactionError.message);
    }

    return {
      ...normalizePost(data),
      my_reaction: userReactionData?.reaction ?? null,
    };
  } catch (error) {
    console.error('[posts] Get post by ID error:', error.message);
    throw error;
  }
};

/**
 * Create new post
 * Images are uploaded first, then post is created only if all uploads succeed
 */
export const createPost = async (alumniId, postData) => {
  try {
    const now = formatDatabaseLocalTimestamp();
    const uploadedImagePaths = [];
    if (postData.images && postData.images.length > 0) {
      try {
        // postData.images now contains the {uri, name, type} objects from CreatePostScreen
        const uploadPromises = postData.images.map(imageFile => uploadPostImage(null, imageFile, 'luminus_assets'));
        const results = await Promise.all(uploadPromises);
        uploadedImagePaths.push(...results.filter(path => Boolean(path)));
      } catch (imageError) {
        console.error('[posts] Image upload failed, post will not be created:', imageError.message);
        throw imageError;
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([{
        alumni_id: alumniId,
        caption: postData.caption ?? '',
        visibility: postData.visibility || 'public',
        is_draft: postData.is_draft || false,
        moderation_status: 'pending',
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single();

    if (error) {
      console.error('[posts] Create post insert error:', error.code, error.message);
      throw error;
    }

    if (!data) {
      throw new Error('Post creation returned no data');
    }

    if (uploadedImagePaths.length > 0) {
      try {
        const imageRecords = uploadedImagePaths.map(imagePath => ({
          post_id: data.id,
          image_path: imagePath,
        }));
        
        const { error: insertError } = await supabase
          .from('images_posts')
          .insert(imageRecords);

        if (insertError) {
          console.error('[posts] Failed to link images to post:', insertError.message);
          throw insertError;
        }
      } catch (linkError) {
        console.error('[posts] Error linking images:', linkError.message);
        throw linkError;
      }
    }

    return normalizePost(data);
  } catch (error) {
    console.error('[posts] Create post error:', error.message || error);
    throw error;
  }
};

/**
 * Update post
 */
export const updatePost = async (postId, updates) => {
  try {
    const { images = [], remove_image_ids = [], ...postUpdates } = updates || {};
    const timestampedUpdates = {
      ...postUpdates,
      updated_at: formatDatabaseLocalTimestamp(),
    };

    const { data, error } = await supabase
      .from('posts')
      .update(timestampedUpdates)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(remove_image_ids) && remove_image_ids.length > 0) {
      const { data: imagesToRemove, error: fetchError } = await supabase
        .from('images_posts')
        .select('id, image_path')
        .eq('post_id', postId)
        .in('id', remove_image_ids);

      if (fetchError) {
        throw fetchError;
      }

      const imagePaths = (imagesToRemove || []).map((image) => image.image_path).filter(Boolean);

      if (imagePaths.length > 0) {
        const { error: deleteStorageError } = await supabase.storage
          .from('luminus_assets')
          .remove(imagePaths);

        if (deleteStorageError) {
          console.warn('[posts] Failed to delete removed post images from storage:', deleteStorageError.message);
        }
      }

      const { error: deleteRowsError } = await supabase
        .from('images_posts')
        .delete()
        .in('id', remove_image_ids);

      if (deleteRowsError) {
        throw deleteRowsError;
      }
    }

    const uploadedImages = Array.isArray(images) && images.length > 0
      ? await Promise.all(images.map((imageFile) => uploadPostImage(postId, imageFile, 'luminus_assets').catch((uploadError) => {
          console.warn('[posts] Failed to upload image during post update:', uploadError?.message || uploadError);
          return null;
        })))
      : [];

    const hasUploadedImages = uploadedImages.some(Boolean);

    if (hasUploadedImages) {
      const { data: refreshedPost, error: refreshError } = await supabase
        .from('posts')
        .select(`
          *,
          images_posts(id, image_path)
        `)
        .eq('id', postId)
        .single();

      if (refreshError) {
        throw refreshError;
      }

      return normalizePost(refreshedPost);
    }

    return normalizePost(data);
  } catch (error) {
    console.error('[posts] Update post error:', error.message);
    throw error;
  }
};

/**
 * Upload post image - REWRITTEN TO USE FORMDATA
 * @param {number|null} postId - Post ID (can be null when uploading before post creation)
 * @param {object|string} imageSource - The formatted {uri, name, type} object from the UI
 * @param {string} bucket - Storage bucket name (default: luminus_assets)
 * @returns {string} Public URL of uploaded image
 */
export const uploadPostImage = async (postId, imageSource, bucket = 'luminus_assets') => {
  try {
    // 1. Sanitize the incoming data (fallback for strings just in case)
    const isObject = typeof imageSource === 'object' && imageSource !== null;
    const uri = isObject ? imageSource.uri : imageSource;
    const safeName = isObject && imageSource.name 
      ? imageSource.name 
      : `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
    const mimeType = isObject && imageSource.type ? imageSource.type : 'image/jpeg';

    const objectPath = `post_images/${safeName}`;

    // 2. Wrap the payload in FormData to bypass React Native ArrayBuffer issues
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: safeName,
      type: mimeType,
    });

    // 3. Send the FormData directly to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, formData);

    if (uploadError) {
      console.error('[posts] Supabase Storage Upload Error:', uploadError.message);
      throw uploadError;
    }

    const storedPath = objectPath;

    // 4. Only insert into images_posts when a postId is already known
    if (postId) {
      const { error: insertError } = await supabase.from('images_posts').insert([{
        post_id: postId,
        image_path: storedPath,
      }]);

      if (insertError) {
        console.error('[posts] Failed to insert image record:', insertError.message);
        throw insertError;
      }
    }

    return storedPath;
  } catch (error) {
    console.error('[posts] Upload image error:', error.message);
    throw error;
  }
};

/**
 * Get post comments
 */
export const getPostComments = async (postId, limit = 50, announcementId = null) => {
  try {
    let query = supabase
      .from('comments')
      .select(`
        *,
        alumnis:alumni_id(id, first_name, last_name, email, alumni_photo),
        replies:parent_id(count)
      `)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (announcementId) {
      query = query.eq('announcement_id', announcementId);
    } else {
      query = query.eq('post_id', postId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeComment);
  } catch (error) {
    console.error('[comments] Get comments error:', error.message);
    throw error;
  }
};

/**
 * Get comment replies
 */
export const getCommentReplies = async (parentCommentId) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        alumnis:alumni_id(id, first_name, last_name, email, alumni_photo)
      `)
      .eq('parent_id', parentCommentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeComment);
  } catch (error) {
    console.error('[comments] Get replies error:', error.message);
    throw error;
  }
};

/**
 * Add comment to post
 */
export const addComment = async (postId, alumniId, commentText, parentId = null, announcementId = null) => {
  try {
    const row = announcementId
      ? { announcement_id: announcementId, alumni_id: alumniId, comment: commentText, parent_id: parentId, moderation_status: 'pending' }
      : { post_id: postId, alumni_id: alumniId, comment: commentText, parent_id: parentId, moderation_status: 'pending' };

    const { data, error } = await supabase
      .from('comments')
      .insert([row])
      .select(`
        *,
        alumnis:alumni_id(id, first_name, last_name, email, alumni_photo)
      `)
      .single();

    if (error) throw error;
    return normalizeComment(data);
  } catch (error) {
    console.error('[comments] Add comment error:', error.message);
    throw error;
  }
};

/**
 * Update comment
 */
export const updateComment = async (commentId, commentText) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .update({ comment: commentText })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[comments] Update comment error:', error.message);
    throw error;
  }
};

/**
 * Delete comment
 */
export const deleteComment = async (commentId) => {
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  } catch (error) {
    console.error('[comments] Delete comment error:', error.message);
    throw error;
  }
};

/**
 * Get post reactions
 */
export const getPostReactions = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('reactions')
      .select('id, reaction, alumni_id')
      .eq('post_id', postId);

    if (error) throw error;
    return (data || []).map(normalizePost);
  } catch (error) {
    console.error('[reactions] Get reactions error:', error.message);
    throw error;
  }
};

/**
 * Add reaction to post
 */
export const addReaction = async (postId, alumniId, reactionType = 'like', announcementId = null) => {
  try {
    let existingQuery = supabase
      .from('reactions')
      .select('id')
      .eq('alumni_id', alumniId)
      .eq('reaction', reactionType);

    existingQuery = announcementId
      ? existingQuery.eq('announcement_id', announcementId)
      : existingQuery.eq('post_id', postId);

    const { data: existingData } = await existingQuery.single();
    if (existingData) return existingData;

    const row = announcementId
      ? { announcement_id: announcementId, alumni_id: alumniId, reaction: reactionType }
      : { post_id: postId, alumni_id: alumniId, reaction: reactionType };

    const { data, error } = await supabase
      .from('reactions')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[reactions] Add reaction error:', error.message);
    throw error;
  }
};

/**
 * Remove reaction from post
 */
export const removeReaction = async (postId, alumniId, reactionType = 'like', announcementId = null) => {
  try {
    let query = supabase
      .from('reactions')
      .delete()
      .eq('alumni_id', alumniId)
      .eq('reaction', reactionType);

    query = announcementId
      ? query.eq('announcement_id', announcementId)
      : query.eq('post_id', postId);

    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    console.error('[reactions] Remove reaction error:', error.message);
    throw error;
  }
};

/**
 * Create repost
 */
export const createRepost = async (originalPostId, alumniId, caption = null) => {
  try {
    const { data, error } = await supabase
      .from('reposts')
      .insert([{
        post_id: originalPostId,
        alumni_id: alumniId,
        caption,
        moderation_status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[reposts] Create repost error:', error.message);
    throw error;
  }
};

/**
 * Delete repost
 */
export const deleteRepost = async (repostId) => {
  try {
    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('id', repostId);

    if (error) throw error;
  } catch (error) {
    console.error('[reposts] Delete repost error:', error.message);
    throw error;
  }
};