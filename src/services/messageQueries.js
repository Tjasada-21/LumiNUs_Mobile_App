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

// Best-effort resolve handles to alumni IDs by splitting handle into first and last name
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

  return results; // map handle => alumni row
};

const normalizeOutgoingContent = (content) => {
  const value = String(content ?? '');

  if (!value) {
    return '';
  }

  // Avoid double encryption if a caller already passed encrypted text.
  if (value.startsWith('enc:') || value.startsWith('U2FsdGVkX1')) {
    return value;
  }

  return encryptMessage(value);
};

/**
 * Messages & Chat Queries
 */

/**
 * Get direct messages between two users
 */
export const getDirectMessages = async (userId1, userId2, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, alumni_photo),
        receiver:receiver_id(id, first_name, last_name, alumni_photo)
      `)
      .or(
        `and(sender_id.eq.${userId1}, receiver_id.eq.${userId2}), and(sender_id.eq.${userId2}, receiver_id.eq.${userId1})`
      )
      .not('deleted_by', 'cs', `{${userId1}}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Load attachments with signed URLs for each message
    const messagesWithAttachments = await Promise.all((data || []).map(async (msg) => {
      const decryptedMsg = toDecryptedMessage(msg);
      const attachments = await getMessageAttachments(msg.id).catch(() => []);
      return {
        ...decryptedMsg,
        attachments: attachments.length > 0 ? attachments : undefined,
      };
    }));

    return messagesWithAttachments.reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error('[messages] Get direct messages error:', error.message);
    throw error;
  }
};

/**
 * Send direct message
 */
export const sendDirectMessage = async (senderId, receiverId, content, attachments = []) => {
  try {
    const encryptedContent = normalizeOutgoingContent(content);

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: senderId,
        receiver_id: receiverId,
        content: encryptedContent,
        is_read: false,
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

    // Handle mentions: extract handles from plain content, resolve to alumni, insert mention rows and notify
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
            // fallback: insert handle string if resolution failed
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

    // Send a push notification to the receiver if they are logged in and have a token
    try {
      const { data: receiverRow, error: receiverError } = await supabase
        .from('alumnis')
        .select('push_token, first_name, last_name')
        .eq('id', receiverId)
        .eq('is_online', true)
        .maybeSingle();

      if (!receiverError && receiverRow && receiverRow.push_token) {
        const sender = await supabase.from('alumnis').select('first_name, last_name').eq('id', senderId).maybeSingle().then(r => r.data || null);
        const senderName = sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() : 'Someone';

        // Use our new retry wrapper instead of direct call
        await sendPushNotificationWithRetry(
          [receiverRow.push_token],
          'New Message',
          `${senderName} sent you a message.`,
          { type: 'message', messageId: data.id }
        );
      }
    } catch (notifErr) {
      console.error('[messages] Failed to query receiver data for push notification:', notifErr?.message || notifErr);
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
 * Delete message
 */
/**
 * Soft Delete message
 */
export const deleteMessage = async (messageId, userId) => {
  try {
    // Fetch current array to avoid overwriting if the other user also deleted it
    const { data: msg } = await supabase.from('messages').select('deleted_by').eq('id', messageId).single();
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
 * Upload message attachment securely to luminus_assets
 */
export const uploadMessageAttachment = async (messageId, attachmentUri) => {
  try {
    
    // Helper to convert local file uri (file:// or content://) to a Blob using XHR
    // Try multiple strategies to obtain file data suitable for Supabase upload.
    let lastError = null;

    // Infer extension and content type from URI where possible
    const guessExt = String(attachmentUri).split('.').pop()?.toLowerCase();
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic' };
    const inferredMime = mimeMap[guessExt] || null;
    const extension = guessExt || 'jpg';
    const filePath = `messages_attachments/${messageId}-${Date.now()}.${extension}`;

    // Strategy 1: Direct FileSystem read for local files (file:// or content://)
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

    // Strategy 2: fetch and use Blob (works for many URIs)
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

    // Strategy 3: fetch arrayBuffer -> Uint8Array
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

    // If we reached here, all attempts failed
    throw lastError || new Error('Failed to upload attachment');

    if (error) throw error;

    // Save the exact location path to the database table
    await supabase.from('messages_attachments').insert([{
      message_id: messageId,
      attachment_type: 'image',
      attachment_path: filePath,
    }]);

    return filePath;
  } catch (error) {
    console.error('[messages] Upload attachment error:', (error && error.message) || error);
    throw error;
  }
};

/**
 * Get message attachments
 */
/**
 * Get message attachments with Secure Signed URLs from luminus_assets
 */
export const getMessageAttachments = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages_attachments')
      .select('*')
      .eq('message_id', messageId);

    if (error) throw error;

    // Generate signed URLs valid for 1 hour (3600 seconds) for each attachment
    const secureAttachments = await Promise.all((data || []).map(async (att) => {
      // Fallback: If it's already a full HTTP URL (legacy unsecured data), return it so old chats don't break
      if (att.attachment_path && att.attachment_path.startsWith('http')) {
        return att;
      }

      // Generate the temporary secure URL from the luminus_assets bucket
      const { data: signedData, error: signError } = await supabase.storage
        .from('luminus_assets')
        .createSignedUrl(att.attachment_path, 3600); 

      if (signError) {
        console.warn(`[messages] Failed to sign URL for ${att.attachment_path}:`, signError.message);
        return att; // Return as-is, though it will likely fail to load in UI
      }

      // Swap the raw path for the temporary signed URL before sending it to the UI components
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
 * Get conversations list for user
 */
export const getConversations = async (userId, offset = 0, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        sender:sender_id(id, first_name, last_name, email, alumni_photo),
        receiver:receiver_id(id, first_name, last_name, email, alumni_photo),
        content,
        is_read,
        created_at
      `)
      .or(`sender_id.eq.${userId}, receiver_id.eq.${userId}`)
      .not('deleted_by', 'cs', `{${userId}}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Group by conversation partner and get latest message
    const conversations = new Map();
    (data || []).forEach(msg => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const partner = msg.sender_id === userId ? msg.receiver : msg.sender;
      const existingConversation = conversations.get(partnerId);
      const unreadDelta = msg.sender_id !== userId && !msg.is_read ? 1 : 0;

      const decryptedContent = decryptMessage(msg.content);

      if (!existingConversation) {
        conversations.set(partnerId, {
          id: partnerId, // Add partner ID as the conversation ID
          connection_id: partnerId, // Also add as connection_id for ChatScreen compatibility
          // Spread partner fields at top level for ChatScreen compatibility
          first_name: partner?.first_name,
          last_name: partner?.last_name,
          alumni_photo: partner?.alumni_photo,
          email: partner?.email,
          // Original conversation fields
          partner,
          lastMessage: decryptedContent,
          lastMessageTime: msg.created_at,
          isRead: msg.is_read,
          unread_count: unreadDelta,
        });
        return;
      }

      existingConversation.unread_count = Number(existingConversation.unread_count ?? 0) + unreadDelta;

      if (new Date(msg.created_at).getTime() >= new Date(existingConversation.lastMessageTime ?? 0).getTime()) {
        existingConversation.lastMessage = decryptedContent;
        existingConversation.lastMessageTime = msg.created_at;
        existingConversation.isRead = msg.is_read;
        existingConversation.partner = partner;
        existingConversation.first_name = partner?.first_name;
        existingConversation.last_name = partner?.last_name;
        existingConversation.alumni_photo = partner?.alumni_photo;
        existingConversation.email = partner?.email;
      }
    });

    return Array.from(conversations.values());
  } catch (error) {
    console.error('[messages] Get conversations error:', error.message);
    throw error;
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
      .eq('is_read', false);

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

    // Add members
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
    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, alumni_photo)
      `)
      .eq('group_chat_id', groupChatId)
      .not('deleted_by', 'cs', `{${userId}}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Load attachments with signed URLs for each message
    const messagesWithAttachments = await Promise.all((data || []).map(async (msg) => {
      const decryptedMsg = toDecryptedMessage(msg);
      const attachments = await getMessageAttachments(msg.id).catch(() => []);
      return {
        ...decryptedMsg,
        attachments: attachments.length > 0 ? attachments : undefined,
      };
    }));

    return messagesWithAttachments.reverse();
  } catch (error) {
    console.error('[group_messages] Get messages error:', error.message);
    throw error;
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
      }])
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, alumni_photo)
      `)
      .single();

    if (error) throw error;

    // Upload attachments if provided
    if (attachments.length > 0) {
      await Promise.all(
        attachments.map((att) => uploadMessageAttachment(data.id, att))
      );
    }

    // Handle mentions in group messages: extract handles, resolve, insert mention rows, notify mentioned members
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
    // Notify group members (except sender)
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('group_chat_members')
        .select('alumni_id')
        .eq('group_chat_id', groupChatId);

      if (!membersError && Array.isArray(membersData) && membersData.length > 0) {
        const memberIds = membersData.map((member) => member.alumni_id).filter((id) => id && id !== senderId);

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
              // Use our new retry wrapper instead of direct call
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
      console.error('[group_messages] Failed to query group member data for push notification:', notifErr?.message || notifErr);
    }

    return toDecryptedMessage(data);
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
    const { data: msg } = await supabase.from('group_messages').select('deleted_by').eq('id', groupMessageId).single();
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
        members:group_chat_members!inner(alumni_id, last_read_message_id),
        lastMessage:group_messages(id, content, created_at, sender:sender_id(first_name, last_name))
      `)
      .eq('members.alumni_id', alumniId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const groupChats = data || [];
    const groupIds = groupChats.map((groupChat) => groupChat?.id).filter(Boolean);

    const { data: messagesData, error: messagesError } = groupIds.length > 0
      ? await supabase
          .from('group_messages')
          .select('id, group_chat_id, sender_id, created_at')
          .in('group_chat_id', groupIds)
          .order('created_at', { ascending: true })
      : { data: [], error: null };

    if (messagesError) throw messagesError;

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
      const currentMember = members.find((member) => String(member?.alumni_id) === String(alumniId)) ?? null;
      const lastReadMessageId = Number(currentMember?.last_read_message_id ?? 0);
      const groupMessages = messagesByGroupId.get(groupChat?.id) ?? [];

      const unreadCount = groupMessages.filter((message) => {
        return Number(message?.sender_id) !== Number(alumniId)
          && Number(message?.id) > lastReadMessageId;
      }).length;

      const lastMessageArray = Array.isArray(groupChat?.lastMessage) ? groupChat.lastMessage : [];
      const decryptedLastMessage = lastMessageArray.map((message) => toDecryptedMessage(message));

      return {
        ...groupChat,
        lastMessage: decryptedLastMessage,
        unread_count: unreadCount,
      };
    });
  } catch (error) {
    console.error('[group_chats] Get user chats error:', error.message);
    throw error;
  }
};
