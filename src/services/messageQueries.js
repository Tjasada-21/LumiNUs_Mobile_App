import supabase from './supabase';
import { decryptMessage, encryptMessage } from '../utils/cryptoUtils';

const toDecryptedMessage = (message) => {
  if (!message || typeof message !== 'object') {
    return message;
  }

  return {
    ...message,
    content: decryptMessage(message.content),
  };
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).reverse().map(toDecryptedMessage); // Reverse to show oldest first
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
export const deleteMessage = async (messageId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  } catch (error) {
    console.error('[messages] Delete message error:', error.message);
    throw error;
  }
};

/**
 * Upload message attachment
 */
export const uploadMessageAttachment = async (messageId, attachmentUri, bucket = 'message-attachments') => {
  try {
    const response = await fetch(attachmentUri);
    const blob = await response.blob();

    const fileName = `${messageId}-${Date.now()}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Save attachment record to database
    await supabase.from('messages_attachments').insert([{
      message_id: messageId,
      attachment_type: 'file',
      attachment_path: publicUrlData.publicUrl,
    }]);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('[messages] Upload attachment error:', error.message);
    throw error;
  }
};

/**
 * Get message attachments
 */
export const getMessageAttachments = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages_attachments')
      .select('*')
      .eq('message_id', messageId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[messages] Get attachments error:', error.message);
    throw error;
  }
};

/**
 * Get conversations list for user
 */
export const getConversations = async (userId, limit = 50) => {
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
      .order('created_at', { ascending: false });

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
        members.push({ group_chat_id: data.id, alumni_id: id, role: 'member' });
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
export const getGroupMessages = async (groupChatId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, alumni_photo)
      `)
      .eq('group_chat_id', groupChatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).reverse().map(toDecryptedMessage);
  } catch (error) {
    console.error('[group_messages] Get messages error:', error.message);
    throw error;
  }
};

/**
 * Send group message
 */
export const sendGroupMessage = async (groupChatId, senderId, content) => {
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
 * Delete group message
 */
export const deleteGroupMessage = async (groupMessageId) => {
  try {
    const { error } = await supabase
      .from('group_messages')
      .delete()
      .eq('id', groupMessageId);

    if (error) throw error;
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
        role: 'member',
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
