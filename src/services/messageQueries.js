import supabase from './supabase';
import { decryptMessage, encryptMessage } from '../utils/cryptoUtils';
import * as FileSystem from 'expo-file-system';
import { sendPushNotification } from './NotificationSender';

/**
 * Helper to send push notifications with a 1-time retry and robust error logging.
 */
const sendPushNotificationWithRetry = async (tokens, title, body, data) => {
  try {
    await sendPushNotification(tokens, title, body, data);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await sendPushNotification(tokens, title, body, data);
    } catch (retryError) {
      console.error('[Notification] Retry also failed. Logging failure:', retryError?.message || retryError);
    }
  };
};

const toDecryptedMessage = (message) => {
  if (!message || typeof message !== 'object') {
    return message;
  }
  return {
    ...message,
    content: decryptMessage(message.content),
  };
};

// Extract mention handles like @first_last from plain text
const extractMentionHandles = (text) => {
  const pattern = /@([a-zA-Z0-9_.-]+)/g;
  const found = new Set();
  let match;
  const value = String(text ?? '');
  while ((match = pattern.exec(value)) !== null) {
    if (match[1]) found.add(match[1].toLowerCase());
  }
  return Array.from(found);
};

// Best-effort resolve handles to alumni IDs
const resolveHandlesToAlumni = async (handles) => {
  const results = {};
  for (const handle of handles) {
    try {
      const parts = handle.split('_');
      const first = parts[0] ? `${parts[0]}%` : '%';
      const last = parts.length > 1 ? `${parts.slice(1).join(' ')}%` : '%';

      const { data, error } = await supabase
        .from('alumnis')
        .select('id, push_token, first_name, last_name')
        .ilike('first_name', first)
        .ilike('last_name', last)
        .limit(1)
        .maybeSingle();

      if (!error && data && data.id) {
        results[handle] = data;
      }
    } catch (err) {
      // ignore a single handle resolution error
    }
  }
  return results;
};

const normalizeOutgoingContent = (content) => {
  const value = String(content ?? '');
  if (!value) return '';
  if (value.startsWith('enc:') || value.startsWith('U2FsdGVkX1')) {
    return value;
  }
  return encryptMessage(value);
};

/**
 * Fetch a single user profile (alumni or admin) based on type
 */
const getUserProfile = async (userId, userType) => {
  try {
    if (!userId || !userType) return null;
    
    if (userType === 'alumni') {
      const { data } = await supabase
        .from('alumnis')
        .select('id, first_name, last_name, alumni_photo, email, program')
        .eq('id', userId)
        .maybeSingle();
      
      return data ? { ...data, user_type: 'alumni' } : null;
    } 
    
    if (userType === 'admin') {
      const { data } = await supabase
        .from('admins')
        .select('id, admin_first_name, admin_last_name, photo, admin_email')
        .eq('id', userId)
        .maybeSingle();
      
      return data ? {
        id: data.id,
        first_name: data.admin_first_name,
        last_name: data.admin_last_name,
        alumni_photo: data.photo,
        email: data.admin_email,
        program: 'Admin Staff',
        user_type: 'admin'
      } : null;
    }
    
    return null;
  } catch (error) {
    console.error('[messages] Error fetching user profile:', error);
    return null;
  }
};

/**
 * Fetch multiple user profiles (batch) - handles both alumni and admin
 */
const getUserProfiles = async (userInfos) => {
  const profiles = new Map();
  
  if (!userInfos || userInfos.length === 0) return profiles;
  
  // Separate alumni and admin IDs
  const alumniIds = [];
  const adminIds = [];
  
  userInfos.forEach(({ id, type }) => {
    if (type === 'alumni') {
      alumniIds.push(id);
    } else if (type === 'admin') {
      adminIds.push(id);
    }
  });
  
  try {
    // Fetch alumni profiles
    if (alumniIds.length > 0) {
      const { data: alumni } = await supabase
        .from('alumnis')
        .select('id, first_name, last_name, alumni_photo, email, program')
        .in('id', alumniIds);
      
      (alumni || []).forEach(user => {
        profiles.set(`alumni_${user.id}`, { ...user, user_type: 'alumni' });
      });
    }
    
    // Fetch admin profiles
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from('admins')
        .select('id, admin_first_name, admin_last_name, photo, admin_email')
        .in('id', adminIds);
      
      (admins || []).forEach(user => {
        profiles.set(`admin_${user.id}`, {
          id: user.id,
          first_name: user.admin_first_name,
          last_name: user.admin_last_name,
          alumni_photo: user.photo,
          email: user.admin_email,
          program: 'Admin Staff',
          user_type: 'admin'
        });
      });
    }
    
    return profiles;
  } catch (error) {
    console.error('[messages] Error fetching user profiles:', error);
    return profiles;
  }
};

/**
 * Get sender name from either alumni or admin table
 */
const getSenderName = async (senderId, senderType) => {
  try {
    if (senderType === 'alumni') {
      const { data } = await supabase
        .from('alumnis')
        .select('first_name, last_name')
        .eq('id', senderId)
        .maybeSingle();
      
      return data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : 'Someone';
    } else {
      const { data } = await supabase
        .from('admins')
        .select('admin_first_name, admin_last_name')
        .eq('id', senderId)
        .maybeSingle();
      
      return data ? `${data.admin_first_name || ''} ${data.admin_last_name || ''}`.trim() : 'Admin Staff';
    }
  } catch {
    return 'Someone';
  }
};

/**
 * Get direct messages between two users (supports alumni & admin)
 */
/**
 * Get direct messages between two users (supports alumni & admin)
 */
export const getDirectMessages = async (userId1, userId2, limit = 50, offset = 0, receiverType = 'alumni') => {
  if (!userId1 || !userId2) return [];
  
  try {
    // Get messages without joins because of polymorphic relationship
    // Include receiver_type in the query to avoid mixing admin/alumni messages
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId1},receiver_id.eq.${userId2},receiver_type.eq.${receiverType}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1},sender_type.eq.${receiverType})`
      )
      .not('deleted_by', 'cs', `{${userId1}}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    if (!messagesData || messagesData.length === 0) {
      return [];
    }

    // Collect unique user IDs with their types
    const uniqueUsers = new Map();
    messagesData.forEach(msg => {
      if (msg.sender_id && msg.sender_type) {
        uniqueUsers.set(`${msg.sender_type}_${msg.sender_id}`, { 
          id: msg.sender_id, 
          type: msg.sender_type 
        });
      }
      if (msg.receiver_id && msg.receiver_type) {
        uniqueUsers.set(`${msg.receiver_type}_${msg.receiver_id}`, { 
          id: msg.receiver_id, 
          type: msg.receiver_type 
        });
      }
    });

    // Fetch all user profiles
    const userProfiles = await getUserProfiles(Array.from(uniqueUsers.values()));

    // Map users to messages and load attachments
    const messagesWithAttachments = await Promise.all(
      messagesData.map(async (msg) => {
        const decryptedMsg = toDecryptedMessage(msg);
        const attachments = await getMessageAttachments(msg.id).catch(() => []);
        
        const senderKey = `${msg.sender_type}_${msg.sender_id}`;
        const receiverKey = `${msg.receiver_type}_${msg.receiver_id}`;
        
        return {
          ...decryptedMsg,
          sender: userProfiles.get(senderKey) || null,
          receiver: userProfiles.get(receiverKey) || null,
          attachments: attachments.length > 0 ? attachments : undefined,
        };
      })
    );

    return messagesWithAttachments.reverse();
  } catch (error) {
    console.error('[messages] Get direct messages error:', error.message);
    return [];
  }
};

/**
 * Send direct message (supports alumni & admin)
 */
export const sendDirectMessage = async (senderId, receiverId, content, attachments = [], senderType = 'alumni', receiverType = 'alumni') => {
  try {
    const encryptedContent = normalizeOutgoingContent(content);

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: senderId,
        receiver_id: receiverId,
        content: encryptedContent,
        is_read: false,
        sender_type: senderType,
        receiver_type: receiverType,
        
      }])
      .select()
      .single();

    if (error) throw error;

    // Upload attachments if provided
    if (attachments.length > 0) {
      await Promise.all(
        attachments.map(att => uploadMessageAttachment(data.id, att))
      );
    }

    // Handle mentions
    try {
      const handles = extractMentionHandles(content);
      if (handles.length > 0) {
        const resolved = await resolveHandlesToAlumni(handles);
        const mentionInserts = [];
        const notifyIds = [];

        Object.entries(resolved).forEach(([handle, alumni]) => {
          if (alumni && alumni.id) {
            mentionInserts.push({ message_id: data.id, alumni_id: alumni.id });
            if (alumni.id !== senderId) notifyIds.push(alumni.id);
          } else {
            mentionInserts.push({ message_id: data.id, handle });
          }
        });

        if (mentionInserts.length > 0) {
          await supabase.from('message_mentions').insert(mentionInserts).catch(() => null);
        }

        if (notifyIds.length > 0) {
          const { data: alumniRows, error: alumniError } = await supabase
            .from('alumnis')
            .select('push_token')
            .in('id', notifyIds)
            .not('push_token', 'is', null)
            .eq('is_online', true);

          if (!alumniError && Array.isArray(alumniRows) && alumniRows.length > 0) {
            const tokens = alumniRows.map(r => r.push_token).filter(Boolean);
            if (tokens.length > 0) {
              await sendPushNotificationWithRetry(
                tokens,
                'Mentioned in chat',
                'You were mentioned in a message.',
                { type: 'mention', messageId: data.id }
              );
            }
          }
        }
      }
    } catch (mentionErr) {
      console.error('[messages] Failed to record/notify mentions:', mentionErr?.message || mentionErr);
    }

    // Send push notification to receiver (only for alumni receivers)
    if (receiverType === 'alumni') {
      try {
        const { data: receiverRow, error: receiverError } = await supabase
          .from('alumnis')
          .select('push_token, first_name, last_name')
          .eq('id', receiverId)
          .eq('is_online', true)
          .maybeSingle();

        if (!receiverError && receiverRow && receiverRow.push_token) {
          const senderName = await getSenderName(senderId, senderType);

          await sendPushNotificationWithRetry(
            [receiverRow.push_token],
            'New Message',
            `${senderName} sent you a message.`,
            { type: 'message', messageId: data.id }
          );
        }
      } catch (notifErr) {
        console.error('[messages] Failed to send push notification:', notifErr?.message || notifErr);
      }
    }

    return toDecryptedMessage(data);
  } catch (error) {
    console.error('[messages] Send message error:', error.message);
    throw error;
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[messages] Mark as read error:', error.message);
    throw error;
  }
};

/**
 * Mark multiple messages as read
 */
export const markMessagesAsRead = async (messageIds) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds);

    if (error) throw error;
  } catch (error) {
    console.error('[messages] Mark messages as read error:', error.message);
    throw error;
  }
};

/**
 * Mark a group chat as read for a member
 */
export const markGroupChatAsRead = async (groupChatId, alumniId, lastReadMessageId) => {
  try {
    const { data, error } = await supabase
      .from('group_chat_members')
      .update({ last_read_message_id: lastReadMessageId })
      .eq('group_chat_id', groupChatId)
      .eq('alumni_id', alumniId)
      .select('id, group_chat_id, alumni_id, last_read_message_id')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[group_chats] Mark as read error:', error.message);
    throw error;
  }
};

/**
 * Soft Delete message
 */
export const deleteMessage = async (messageId, userId) => {
  try {
    const { data: msg } = await supabase
      .from('messages')
      .select('deleted_by')
      .eq('id', messageId)
      .single();
   
    const currentDeleted = msg?.deleted_by || [];
   
    if (!currentDeleted.includes(userId)) {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_by: [...currentDeleted, userId] })
        .eq('id', messageId);
      if (error) throw error;
    }
  } catch (error) {
    console.error('[messages] Delete message error:', error.message);
    throw error;
  }
};

/**
 * Upload message attachment
 */
export const uploadMessageAttachment = async (messageId, attachmentUri) => {
  try {
    let lastError = null;

    const guessExt = String(attachmentUri).split('.').pop()?.toLowerCase();
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic' };
    const inferredMime = mimeMap[guessExt] || null;
    const extension = guessExt || 'jpg';
    const filePath = `messages_attachments/${messageId}-${Date.now()}.${extension}`;

    // Strategy 1: Direct FileSystem read
    try {
      const isLocal = /^file:\/\//i.test(attachmentUri) || /^content:\/\//i.test(attachmentUri);
      if (isLocal) {
        const base64 = await FileSystem.readAsStringAsync(attachmentUri, { encoding: 'base64' });
        const mime = inferredMime || 'image/jpeg';
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const { data, error } = await supabase.storage
          .from('luminus_assets')
          .upload(filePath, bytes, { contentType: mime });

        if (error) throw error;

        await supabase.from('messages_attachments').insert([{
          message_id: messageId,
          attachment_type: 'image',
          attachment_path: filePath,
        }]);

        return filePath;
      } else {
        throw new Error('Not a local URI');
      }
    } catch (err) {
      lastError = err;
    }

    // Strategy 2: fetch and use Blob
    try {
      const res = await fetch(attachmentUri);
      const blob = await res.blob();
      const contentType = blob?.type || inferredMime || 'image/jpeg';

      const { data, error } = await supabase.storage
        .from('luminus_assets')
        .upload(filePath, blob, { contentType });

      if (error) throw error;

      await supabase.from('messages_attachments').insert([{
        message_id: messageId,
        attachment_type: 'image',
        attachment_path: filePath,
      }]);

      return filePath;
    } catch (err) {
      lastError = err;
    }

    // Strategy 3: fetch arrayBuffer
    try {
      const res2 = await fetch(attachmentUri);
      const arrayBuffer = await res2.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const contentType = res2.headers.get('content-type') || inferredMime || 'image/jpeg';

      const { data, error } = await supabase.storage
        .from('luminus_assets')
        .upload(filePath, uint8, { contentType });

      if (error) throw error;

      await supabase.from('messages_attachments').insert([{
        message_id: messageId,
        attachment_type: 'image',
        attachment_path: filePath,
      }]);

      return filePath;
    } catch (err) {
      lastError = err;
    }

    throw lastError || new Error('Failed to upload attachment');
  } catch (error) {
    console.error('[messages] Upload attachment error:', (error && error.message) || error);
    throw error;
  }
};

/**
 * Get message attachments with signed URLs
 */
export const getMessageAttachments = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages_attachments')
      .select('*')
      .eq('message_id', messageId);

    if (error) throw error;

    const secureAttachments = await Promise.all((data || []).map(async (att) => {
      if (att.attachment_path && att.attachment_path.startsWith('http')) {
        return att;
      }

      const { data: signedData, error: signError } = await supabase.storage
        .from('luminus_assets')
        .createSignedUrl(att.attachment_path, 3600);

      if (signError) {
        console.warn(`[messages] Failed to sign URL for ${att.attachment_path}:`, signError.message);
        return att;
      }

      return {
        ...att,
        attachment_path: signedData.signedUrl
      };
    }));

    return secureAttachments;
  } catch (error) {
    console.error('[messages] Get attachments error:', error.message);
    throw error;
  }
};

/**
 * Get conversations list for user (supports both alumni and admin)
 */
export const getConversations = async (userId, userType = 'alumni', offset = 0, limit = 50) => {
  try {
    // Get all messages involving this user
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at,
        sender_type,
        receiver_type
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .not('deleted_by', 'cs', `{${userId}}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!messagesData || messagesData.length === 0) {
      return [];
    }

    // Group by conversation partner (including their type)
    const conversationMap = new Map();

    messagesData.forEach(msg => {
      const isSender = msg.sender_id === userId;
      const partnerId = isSender ? msg.receiver_id : msg.sender_id;
      const partnerType = isSender ? msg.receiver_type : msg.sender_type;
      const partnerKey = `${partnerType}_${partnerId}`;
      
      if (!conversationMap.has(partnerKey)) {
        conversationMap.set(partnerKey, {
          partnerId,
          partnerType,
          messages: [],
          unreadCount: 0,
          latestTimestamp: null,
        });
      }

      const conversation = conversationMap.get(partnerKey);
      conversation.messages.push(msg);
      
      if (!isSender && !msg.is_read) {
        conversation.unreadCount++;
      }

      const msgTime = new Date(msg.created_at).getTime();
      if (!conversation.latestTimestamp || msgTime > conversation.latestTimestamp) {
        conversation.latestTimestamp = msgTime;
      }
    });

    // Fetch partner profiles based on their types
    const userInfos = Array.from(conversationMap.values()).map(conv => ({
      id: conv.partnerId,
      type: conv.partnerType || 'alumni'
    }));
    
    const userProfiles = await getUserProfiles(userInfos);

    // Format conversations for ChatScreen
// Format conversations for ChatScreen
const formattedConversations = Array.from(conversationMap.entries())
  .map(([key, conversation]) => {
    const partnerKey = `${conversation.partnerType}_${conversation.partnerId}`;
    const partner = userProfiles.get(partnerKey) || {};
    const latestMsg = conversation.messages[0]; // Most recent message
    
    return {
      // Use composite ID to differentiate between alumni and admin with same numeric ID
      id: `${conversation.partnerType}_${conversation.partnerId}`,
      connection_id: conversation.partnerId,
      user_type: conversation.partnerType || 'alumni',
      first_name: partner.first_name || 'Unknown',
      last_name: partner.last_name || '',
      email: partner.email || '',
      alumni_photo: partner.alumni_photo || null,
      program: partner.program || (conversation.partnerType === 'admin' ? 'Admin Staff' : ''),
      unread_count: conversation.unreadCount,
      latest_message: {
        id: latestMsg?.id,
        content: decryptMessage(latestMsg?.content || ''),
        created_at: latestMsg?.created_at,
        message: decryptMessage(latestMsg?.content || ''),
        text: decryptMessage(latestMsg?.content || ''),
      },
      last_message: decryptMessage(latestMsg?.content || ''),
      last_message_at: latestMsg?.created_at,
      updated_at: latestMsg?.created_at,
      created_at: latestMsg?.created_at,
    };
  })
  .sort((a, b) => {
    const aTime = new Date(a.latest_message?.created_at || 0).getTime();
    const bTime = new Date(b.latest_message?.created_at || 0).getTime();
    return bTime - aTime;
  })
  .slice(offset, offset + limit);

    return formattedConversations;
  } catch (error) {
    console.error('[messages] Get conversations error:', error.message);
    return [];
  }
};

/**
 * Get unread message count for user
 */
export const getUnreadMessageCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .not('deleted_by', 'cs', `{${userId}}`);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[messages] Get unread count error:', error.message);
    throw error;
  }
};

/**
 * Create group chat
 */
export const createGroupChat = async (createdBy, chatName, memberIds = []) => {
  try {
    const { data, error } = await supabase
      .from('group_chats')
      .insert([{
        name: chatName,
        created_by: createdBy,
      }])
      .select()
      .single();

    if (error) throw error;

    // Add members with proper roles
    const members = [{ group_chat_id: data.id, alumni_id: createdBy, role: 'admin' }];
    memberIds.forEach(id => {
      if (id !== createdBy) {
        members.push({ group_chat_id: data.id, alumni_id: id, role: 'alumni' });
      }
    });

    await supabase.from('group_chat_members').insert(members);

    return data;
  } catch (error) {
    console.error('[group_chats] Create group error:', error.message);
    throw error;
  }
};

/**
 * Get group chat details
 */
export const getGroupChat = async (groupChatId) => {
  try {
    const { data, error } = await supabase
      .from('group_chats')
      .select(`
        *,
        members:group_chat_members(
          id,
          role,
          alumni:alumni_id(id, first_name, last_name, email, alumni_photo)
        )
      `)
      .eq('id', groupChatId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[group_chats] Get group error:', error.message);
    throw error;
  }
};

/**
 * Get group messages
 */
export const getGroupMessages = async (groupChatId, userId, limit = 50, offset = 0) => {
  try {
    // Get messages without joins
    const { data: messagesData, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_chat_id', groupChatId)
      .not('deleted_by', 'cs', `{${userId}}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!messagesData || messagesData.length === 0) {
      return [];
    }

    // Get unique sender IDs
    const senderIds = new Set();
    messagesData.forEach(msg => {
      if (msg.sender_id) senderIds.add(msg.sender_id);
    });

    // Fetch sender profiles (assuming all group chat senders are alumni)
    const { data: senders } = await supabase
      .from('alumnis')
      .select('id, first_name, last_name, alumni_photo')
      .in('id', Array.from(senderIds));

    const senderMap = new Map();
    (senders || []).forEach(sender => senderMap.set(sender.id, sender));

    // Enrich messages with sender data and load attachments
    const messagesWithAttachments = await Promise.all(
      messagesData.map(async (msg) => {
        const decryptedMsg = toDecryptedMessage(msg);
        const attachments = await getMessageAttachments(msg.id).catch(() => []);
        return {
          ...decryptedMsg,
          sender: senderMap.get(msg.sender_id) || null,
          attachments: attachments.length > 0 ? attachments : undefined,
        };
      })
    );

    return messagesWithAttachments.reverse();
  } catch (error) {
    console.error('[group_messages] Get messages error:', error.message);
    return [];
  }
};

/**
 * Send group message
 */
export const sendGroupMessage = async (groupChatId, senderId, content, attachments = []) => {
  try {
    const encryptedContent = normalizeOutgoingContent(content);

    const { data, error } = await supabase
      .from('group_messages')
      .insert([{
        group_chat_id: groupChatId,
        sender_id: senderId,
        content: encryptedContent,
        reactions: {},
      }])
      .select()
      .single();

    if (error) throw error;

    // Upload attachments if provided
    if (attachments.length > 0) {
      await Promise.all(
        attachments.map((att) => uploadMessageAttachment(data.id, att))
      );
    }

    // Handle mentions
    try {
      const handles = extractMentionHandles(content);
      if (handles.length > 0) {
        const resolved = await resolveHandlesToAlumni(handles);
        const mentionInserts = [];
        const notifyIds = [];

        Object.entries(resolved).forEach(([handle, alumni]) => {
          if (alumni && alumni.id) {
            mentionInserts.push({ group_message_id: data.id, alumni_id: alumni.id });
            if (alumni.id !== senderId) notifyIds.push(alumni.id);
          } else {
            mentionInserts.push({ group_message_id: data.id, handle });
          }
        });

        if (mentionInserts.length > 0) {
          await supabase.from('group_message_mentions').insert(mentionInserts).catch(() => null);
        }

        if (notifyIds.length > 0) {
          const { data: alumniRows, error: alumniError } = await supabase
            .from('alumnis')
            .select('push_token')
            .in('id', notifyIds)
            .not('push_token', 'is', null)
            .eq('is_online', true)
            .neq('id', senderId);

          if (!alumniError && Array.isArray(alumniRows) && alumniRows.length > 0) {
            const tokens = alumniRows.map(r => r.push_token).filter(Boolean);
            if (tokens.length > 0) {
              await sendPushNotificationWithRetry(
                tokens,
                'Mentioned in group chat',
                'You were mentioned in a group message.',
                { type: 'group_mention', groupChatId, messageId: data.id }
              );
            }
          }
        }
      }
    } catch (mentionErr) {
      console.error('[group_messages] Failed to record/notify mentions:', mentionErr?.message || mentionErr);
    }

    // Notify group members
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('group_chat_members')
        .select('alumni_id')
        .eq('group_chat_id', groupChatId);

      if (!membersError && Array.isArray(membersData) && membersData.length > 0) {
        const memberIds = membersData
          .map((member) => member.alumni_id)
          .filter((id) => id && id !== senderId);

        if (memberIds.length > 0) {
          const { data: alumniRows, error: alumniError } = await supabase
            .from('alumnis')
            .select('push_token')
            .in('id', memberIds)
            .not('push_token', 'is', null)
            .eq('is_online', true)
            .neq('id', senderId);

          if (!alumniError && Array.isArray(alumniRows) && alumniRows.length > 0) {
            const tokens = alumniRows.map((row) => row.push_token).filter(Boolean);

            if (tokens.length > 0) {
              await sendPushNotificationWithRetry(
                tokens,
                'New Group Message',
                'You have a new group message.',
                { type: 'group_message', groupChatId, messageId: data.id }
              );
            }
          }
        }
      }
    } catch (notifErr) {
      console.error('[group_messages] Failed to send group notification:', notifErr?.message || notifErr);
    }

    // Fetch sender info for the returned message
    const { data: senderData } = await supabase
      .from('alumnis')
      .select('id, first_name, last_name, alumni_photo')
      .eq('id', senderId)
      .maybeSingle();

    const enrichedData = {
      ...data,
      sender: senderData || null,
    };

    return toDecryptedMessage(enrichedData);
  } catch (error) {
    console.error('[group_messages] Send message error:', error.message);
    throw error;
  }
};

/**
 * Update group message reactions
 */
export const updateGroupMessageReactions = async (groupMessageId, reactions) => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .update({ reactions })
      .eq('id', groupMessageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[group_messages] Update reactions error:', error.message);
    throw error;
  }
};

/**
 * Soft Delete group message
 */
export const deleteGroupMessage = async (groupMessageId, userId) => {
  try {
    const { data: msg } = await supabase
      .from('group_messages')
      .select('deleted_by')
      .eq('id', groupMessageId)
      .single();
   
    const currentDeleted = msg?.deleted_by || [];
   
    if (!currentDeleted.includes(userId)) {
      const { error } = await supabase
        .from('group_messages')
        .update({ deleted_by: [...currentDeleted, userId] })
        .eq('id', groupMessageId);
      if (error) throw error;
    }
  } catch (error) {
    console.error('[group_messages] Delete message error:', error.message);
    throw error;
  }
};

/**
 * Add member to group
 */
export const addGroupMember = async (groupChatId, alumniId) => {
  try {
    const { data, error } = await supabase
      .from('group_chat_members')
      .insert([{
        group_chat_id: groupChatId,
        alumni_id: alumniId,
        role: 'alumni',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[group_chats] Add member error:', error.message);
    throw error;
  }
};

/**
 * Remove member from group
 */
export const removeGroupMember = async (groupChatId, alumniId) => {
  try {
    const { error } = await supabase
      .from('group_chat_members')
      .delete()
      .eq('group_chat_id', groupChatId)
      .eq('alumni_id', alumniId);

    if (error) throw error;
  } catch (error) {
    console.error('[group_chats] Remove member error:', error.message);
    throw error;
  }
};

/**
 * Get user's group chats
 */
export const getUserGroupChats = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('group_chats')
      .select(`
        *,
        members:group_chat_members!inner(alumni_id, last_read_message_id, role),
        lastMessage:group_messages(id, content, created_at, sender_id)
      `)
      .eq('members.alumni_id', alumniId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const groupChats = data || [];
    const groupIds = groupChats.map((groupChat) => groupChat?.id).filter(Boolean);

    // Get messages for unread count calculation
    const { data: messagesData, error: messagesError } = groupIds.length > 0
      ? await supabase
          .from('group_messages')
          .select('id, group_chat_id, sender_id, created_at')
          .in('group_chat_id', groupIds)
          .order('created_at', { ascending: true })
      : { data: [], error: null };

    if (messagesError) {
      console.warn('[group_chats] Could not fetch messages for unread counts:', messagesError.message);
    }

    const messagesByGroupId = new Map();
    (messagesData || []).forEach((message) => {
      const groupId = message?.group_chat_id;
      if (!groupId) return;
      const groupMessages = messagesByGroupId.get(groupId) ?? [];
      groupMessages.push(message);
      messagesByGroupId.set(groupId, groupMessages);
    });

    return groupChats.map((groupChat) => {
      const members = Array.isArray(groupChat?.members) ? groupChat.members : [];
      const currentMember = members.find(
        (member) => String(member?.alumni_id) === String(alumniId)
      ) ?? null;
      const lastReadMessageId = Number(currentMember?.last_read_message_id ?? 0);
      const groupMessages = messagesByGroupId.get(groupChat?.id) ?? [];

      const unreadCount = groupMessages.filter((message) => {
        return Number(message?.sender_id) !== Number(alumniId) &&
          Number(message?.id) > lastReadMessageId;
      }).length;

      // Format last message for ChatScreen compatibility
      const lastMessageArray = Array.isArray(groupChat?.lastMessage) ? groupChat.lastMessage : [];
      const latestGroupMessage = lastMessageArray[lastMessageArray.length - 1] || null;
     
      return {
        ...groupChat,
        latest_message: latestGroupMessage ? {
          id: latestGroupMessage.id,
          content: decryptMessage(latestGroupMessage.content || ''),
          created_at: latestGroupMessage.created_at,
          sender_id: latestGroupMessage.sender_id,
        } : null,
        unread_count: unreadCount,
      };
    });
  } catch (error) {
    console.error('[group_chats] Get user chats error:', error.message);
    throw error;
  }
};