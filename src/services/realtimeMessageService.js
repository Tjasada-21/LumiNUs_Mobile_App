import supabase from './supabase';
import { getAuthToken } from './authStorage';
import { decryptMessage } from '../utils/cryptoUtils';

const toDecryptedRealtimeMessage = (message) => {
  if (!message || typeof message !== 'object') {
    return message;
  }

  return {
    ...message,
    content: decryptMessage(message.content),
  };
};

/**
 * Subscribes to real-time message updates for a direct message conversation.
 * This is optional - if it fails, polling will handle message delivery.
 * 
 * @param {number} currentUserId - The ID of the current user
 * @param {number} contactId - The ID of the contact in this conversation
 * @param {function} onMessageReceived - Callback when message arrives: (event, message) => {}
 * @returns {function} Cleanup function to unsubscribe
 */
export const subscribeToDirectMessages = (currentUserId, contactId, onMessageReceived) => {
  if (!supabase || !currentUserId || !contactId) {
    return () => {};
  }

  try {
    const subscription = supabase
      .channel(`messages:${currentUserId}_${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const { new: newMessage } = payload;
          
          // Filter: only messages between these two users
          const isRelevant = 
            (newMessage.sender_id === currentUserId && newMessage.receiver_id === contactId) ||
            (newMessage.sender_id === contactId && newMessage.receiver_id === currentUserId);
          
          if (isRelevant && onMessageReceived) {
            onMessageReceived('insert', toDecryptedRealtimeMessage(newMessage));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const { new: newMessage } = payload;
          
          const isRelevant = 
            (newMessage.sender_id === currentUserId && newMessage.receiver_id === contactId) ||
            (newMessage.sender_id === contactId && newMessage.receiver_id === currentUserId);
          
          if (isRelevant && onMessageReceived) {
            onMessageReceived('update', toDecryptedRealtimeMessage(newMessage));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const { old: oldMessage } = payload;
          
          const isRelevant = 
            (oldMessage.sender_id === currentUserId && oldMessage.receiver_id === contactId) ||
            (oldMessage.sender_id === contactId && oldMessage.receiver_id === currentUserId);
          
          if (isRelevant && onMessageReceived) {
            onMessageReceived('delete', oldMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  } catch (error) {
    // Silently fail - polling will handle it
    return () => {};
  }
};

/**
 * Subscribes to real-time message updates for a group chat conversation.
 * This is optional - if it fails, polling will handle message delivery.
 * 
 * @param {number} groupId - The ID of the group chat
 * @param {function} onMessageReceived - Callback when message arrives: (event, message) => {}
 * @returns {function} Cleanup function to unsubscribe
 */
export const subscribeToGroupMessages = (groupId, onMessageReceived) => {
  if (!supabase || !groupId) {
    return () => {};
  }

  try {
    const subscription = supabase
      .channel(`group_messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_messages',
          filter: `group_chat_id=eq.${groupId}`,
        },
        (payload) => {
          if (onMessageReceived) {
            const event = payload.eventType.toLowerCase();
            const message = event === 'DELETE' ? payload.old : payload.new;
            const safeMessage = event === 'delete' ? message : toDecryptedRealtimeMessage(message);
            onMessageReceived(event, safeMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  } catch (error) {
    // Silently fail - polling will handle it
    return () => {};
  }
};
