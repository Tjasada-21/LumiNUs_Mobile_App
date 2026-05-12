import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  LogBox,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import {
  getDirectMessages,
  getGroupMessages,
  sendDirectMessage,
  sendGroupMessage,
  markMessagesAsRead,
  markGroupChatAsRead,
  deleteMessage as deleteDirectMessage,
  deleteGroupMessage,
  updateGroupMessageReactions,
  getMessageAttachments,
} from '../services/messageQueries';
import { subscribeToDirectMessages, subscribeToGroupMessages } from '../services/realtimeMessageService';
import { getAvatarUri } from '../utils/imageUtils';
import CustomKeyboardView from '../components/CustomKeyboardView';
import styles from '../styles/ConvoScreen.styles';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageInputBar from '../components/MessageInputBar';
import { useUnreadMessages } from '../context/UnreadMessagesContext';
import { ThemedAlert } from '../components/ThemedAlert';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

LogBox.ignoreLogs([
  'VirtualizedList: You have a large list that is slow to update',
]);

const toMentionHandle = (firstName, lastName) => {
  const normalizedHandle = `${firstName ?? ''}_${lastName ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalizedHandle || 'alumni';
};

const extractMentionQuery = (value) => {
  const text = String(value ?? '');
  const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);

  if (!match) {
    return null;
  }

  const query = match[2] ?? '';
  const mentionStart = text.length - query.length - 1;

  return {
    query,
    mentionStart,
    mentionEnd: text.length,
  };
};

const normalizeMessageList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.messages)) {
    return value.messages;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
};

const normalizeTypingUsers = (value) => {
  if (Array.isArray(value?.typing_users)) {
    return value.typing_users;
  }

  return [];
};

const formatMessageTime = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getMessageDate = (message) => {
  const rawValue = message?.created_at ?? message?.sent_at ?? message?.updated_at;

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameMinute = (firstDate, secondDate) => {
  if (!firstDate || !secondDate) {
    return false;
  }

  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate()
    && firstDate.getHours() === secondDate.getHours()
    && firstDate.getMinutes() === secondDate.getMinutes();
};

const sortMessagesAscending = (messageList) => {
  return [...(Array.isArray(messageList) ? messageList : [])].sort((firstMessage, secondMessage) => {
    const firstDate = getMessageDate(firstMessage);
    const secondDate = getMessageDate(secondMessage);

    if (firstDate && secondDate) {
      const firstTime = firstDate.getTime();
      const secondTime = secondDate.getTime();

      if (firstTime !== secondTime) {
        return firstTime - secondTime;
      }
    } else if (firstDate && !secondDate) {
      return -1;
    } else if (!firstDate && secondDate) {
      return 1;
    }

    const firstIdNumeric = Number(firstMessage?.id);
    const secondIdNumeric = Number(secondMessage?.id);
    const hasNumericFirstId = Number.isFinite(firstIdNumeric);
    const hasNumericSecondId = Number.isFinite(secondIdNumeric);

    if (hasNumericFirstId && hasNumericSecondId) {
      return firstIdNumeric - secondIdNumeric;
    }

    const firstId = String(firstMessage?.id ?? '');
    const secondId = String(secondMessage?.id ?? '');
    return firstId.localeCompare(secondId);
  });
};

export default function ConvoScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const { refreshUnreadMessages } = useUnreadMessages();

  const params = route?.params ?? {};
  const contactId = params.contactId ?? params.userId ?? params.id ?? params.contact?.id ?? null;
  const groupId = params.groupId ?? params.group?.id ?? null;
  const isGroup = Boolean(groupId && !contactId);

  const conversationName = params.contactName
    ?? params.userName
    ?? params.contact?.name
    ?? params.groupName
    ?? params.group?.name
    ?? 'Chat';
  const conversationAvatar = params.contactAvatar
    ?? params.userAvatarUri
    ?? params.contactPhoto
    ?? params.avatar
    ?? params.contact?.avatar
    ?? params.groupAvatar
    ?? params.group?.avatar
    ?? '';
  const conversationStatus = params.contactStatus ?? params.status ?? '';
  const groupMembers = Array.isArray(params.groupMembers)
    ? params.groupMembers
    : (Array.isArray(params.group?.members) ? params.group.members : []);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedAttachmentUri, setSelectedAttachmentUri] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [connections, setConnections] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingDebounceRef = useRef(null);

  const hasConversation = Boolean(contactId || groupId);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const allowMentions = true; // Enabled for both DMs and Groups!
  const headerSubtitle = isGroup
    ? (groupMembers.map((member) => member?.name).filter(Boolean).join(', ') || 'Group chat')
    : (conversationStatus || 'Active now');

  const mentionContext = useMemo(() => (allowMentions ? extractMentionQuery(draft) : null), [allowMentions, draft]);

  // Combine connections and group members so you can tag anyone relevant
  const mentionableUsers = useMemo(() => {
    const usersMap = new Map();

    // 1. Add all followed connections
    (connections || []).forEach((c) => {
      if (c?.id) usersMap.set(c.id, c);
    });

    // 2. Add all group members if in a group
    if (isGroup && Array.isArray(groupMembers)) {
      groupMembers.forEach((member) => {
        const alumniData = member?.alumni ?? member; // Adapt to your exact schema
        if (alumniData?.id) usersMap.set(alumniData.id, alumniData);
      });
    }

    return Array.from(usersMap.values());
  }, [connections, groupMembers, isGroup]);

  const mentionSuggestions = useMemo(() => {
    if (!allowMentions || !mentionContext) return [];

    const query = mentionContext.query.toLowerCase();

    // Swap 'connections' for 'mentionableUsers' here!
    return (mentionableUsers || [])
      .map((user) => {
        const firstName = user?.first_name ?? '';
        const lastName = user?.last_name ?? '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Alumni';
        const avatar = getAvatarUri(fullName, user?.alumni_photo);

        return {
          id: user?.id,
          name: fullName,
          handle: toMentionHandle(firstName, lastName),
          avatar,
        };
      })
      .filter((item) => {
        if (!query) return true;
        return item.name.toLowerCase().includes(query) || item.handle.includes(query);
      })
      .slice(0, 5);
  }, [allowMentions, mentionableUsers, mentionContext]);

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) {
      return '';
    }

    const typingNames = typingUsers
      .map((user) => `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim())
      .filter(Boolean);

    if (typingNames.length === 0) {
      return isGroup ? 'Someone is typing...' : `${conversationName} is typing...`;
    }

    if (isGroup) {
      if (typingNames.length === 1) {
        return `${typingNames[0]} is typing...`;
      }

      if (typingNames.length === 2) {
        return `${typingNames[0]} and ${typingNames[1]} are typing...`;
      }

      return 'Several people are typing...';
    }

    return `${typingNames[0]} is typing...`;
  }, [conversationName, isGroup, typingUsers]);

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const supaUser = await getCurrentUser();
      if (!supaUser) return;

      setCurrentUserId(supaUser.id);

      // Load connections (following) for mention suggestions
      try {
        const { getFollowing } = await import('../services/connectionQueries');
        const following = await getFollowing(supaUser.id).catch(() => []);
        setConnections(Array.isArray(following) ? following.map((f) => f.followed ?? f) : []);
      } catch (e) {
        setConnections([]);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
      setConnections([]);
    }
  }, []);

  const updateTypingStatus = useCallback(async (isTyping) => {
    // Typing presence not yet implemented via Supabase; no-op for now
    if (!hasConversation) return;
    if (!isTyping) setTypingUsers([]);
  }, [hasConversation]);

  const loadTypingStatus = useCallback(async () => {
    // Typing presence not implemented server-side for Supabase migration; clear typing users
    if (!hasConversation) {
      setTypingUsers([]);
      return;
    }

    setTypingUsers([]);
  }, [hasConversation]);

  const handleMentionPick = useCallback((mentionHandle) => {
    if (!allowMentions || !mentionContext) {
      return;
    }

    setDraft((currentDraft) => {
      const safeText = String(currentDraft ?? '');
      const prefix = safeText.slice(0, mentionContext.mentionStart);
      const suffix = safeText.slice(mentionContext.mentionEnd);
      return `${prefix}@${mentionHandle} ${suffix}`;
    });
  }, [allowMentions, mentionContext]);

  const handleMentionPress = useCallback(async (token) => {
    if (!allowMentions) return;

    const mentionHandle = String(token ?? '').replace(/^@/, '').toLowerCase();
    if (!mentionHandle) return;

    // 1. Check our local unified list first
    const matchedLocal = (mentionableUsers || []).find((user) => {
      return toMentionHandle(user?.first_name, user?.last_name) === mentionHandle;
    });

    if (matchedLocal?.id) {
      const parentNavigator = navigation.getParent?.();
      if (parentNavigator?.navigate) {
        parentNavigator.navigate('ProfileView', { userId: matchedLocal.id });
        return;
      }
      navigation.navigate('ProfileView', { userId: matchedLocal.id });
      return;
    }

    // 2. If not in local connections/group, fetch their ID from Supabase!
    try {
      const parts = mentionHandle.split('_');
      const first = parts[0] ? `${parts[0]}%` : '%';
      const last = parts.length > 1 ? `${parts.slice(1).join(' ')}%` : '%';

      const { data, error } = await supabase
        .from('alumnis')
        .select('id')
        .ilike('first_name', first)
        .ilike('last_name', last)
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        const parentNavigator = navigation.getParent?.();
        if (parentNavigator?.navigate) {
          parentNavigator.navigate('ProfileView', { userId: data.id });
          return;
        }
        navigation.navigate('ProfileView', { userId: data.id });
      } else {
        ThemedAlert.alert('Mention unavailable', `No profile found for @${mentionHandle}.`);
      }
    } catch (e) {
      console.error('Failed to fetch mentioned user:', e);
    }
  }, [allowMentions, mentionableUsers, navigation]);

  const loadMessages = useCallback(async () => {
    if (!hasConversation) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      let messageList = [];

      if (isGroup) {
        // Pass currentUserId as the 2nd parameter
        messageList = await getGroupMessages(groupId, currentUserId, 200, 0).catch(() => []);
      } else {
        if (!currentUserId) {
          setMessages([]);
          setIsLoading(false);
          return;
        }
        messageList = await getDirectMessages(currentUserId, contactId, 200, 0).catch(() => []);
      }

      setMessages(sortMessagesAscending(messageList));

      if (isGroup && currentUserId) {
        try {
          const latestMessageId = (Array.isArray(messageList) ? messageList : [])
            .map((message) => Number(message?.id ?? 0))
            .filter((messageId) => Number.isFinite(messageId) && messageId > 0)
            .reduce((highestId, messageId) => Math.max(highestId, messageId), 0);

          if (latestMessageId > 0) {
            await markGroupChatAsRead(groupId, currentUserId, latestMessageId).catch(() => {});
            await refreshUnreadMessages().catch(() => {});
          }
        } catch (e) {
          // ignore failures — best-effort
        }
      }

      // Mark direct messages as read via messageQueries helper
      if (!isGroup && currentUserId) {
        try {
          const unreadIds = (Array.isArray(messageList) ? messageList : [])
            .filter((m) => m && m.sender_id === contactId && m.receiver_id === currentUserId && !m.is_read)
            .map((m) => m.id)
            .filter(Boolean);

          if (unreadIds.length > 0) {
            await markMessagesAsRead(unreadIds).catch(() => {});
            await refreshUnreadMessages().catch(() => {});
          }
        } catch (e) {
          // ignore failures — best-effort
        }
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      setMessages([]);
      ThemedAlert.alert('Error', 'Could not load messages.');
    } finally {
      setIsLoading(false);
    }
  }, [contactId, currentUserId, groupId, hasConversation, isGroup, refreshUnreadMessages]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId || isGroup) {
        loadMessages();
      }
      loadTypingStatus();

      return () => {
        updateTypingStatus(false);
      };
    }, [currentUserId, isGroup, loadMessages, loadTypingStatus, updateTypingStatus])
  );

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }

    if (!hasConversation) {
      return undefined;
    }

    if (!draft.trim()) {
      updateTypingStatus(false);
      return undefined;
    }

    typingDebounceRef.current = setTimeout(() => {
      updateTypingStatus(true);
    }, 450);

    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
    };
  }, [draft, hasConversation, updateTypingStatus]);

  // Set up real-time message subscriptions
  useEffect(() => {
    if (!hasConversation) {
      return;
    }

    let unsubscribe = () => {};

    const handleMessageEvent = (event, newMessage) => {
      if (!newMessage) {
        return;
      }

      if (event === 'insert') {
        // New message received
        setMessages((currentMessages) => {
          // Check if message already exists by ID
          const messageExistsById = currentMessages.some((msg) => msg.id === newMessage.id);
          if (messageExistsById) {
            return currentMessages;
          }

          // Check if this is an optimistic message confirmation by matching sender + content + approximate time
          const optimisticDuplicate = currentMessages.some((msg) => 
            msg.sender_id === newMessage.sender_id &&
            msg.content === newMessage.content &&
            Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 1000
          );
          if (optimisticDuplicate) {
            // Replace the optimistic message with the real one (so it gets the actual ID)
            return sortMessagesAscending(
              currentMessages.map((msg) =>
                msg.sender_id === newMessage.sender_id &&
                msg.content === newMessage.content &&
                Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 1000
                  ? newMessage
                  : msg
              )
            );
          }

          return sortMessagesAscending([...currentMessages, newMessage]);
        });

        // Load attachments if they exist (they may be inserted shortly after the message)
        const loadAttachments = async () => {
          const attachments = await getMessageAttachments(newMessage.id).catch(() => []);
          if (attachments.length > 0) {
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === newMessage.id ? { ...msg, attachments } : msg
              )
            );
          }
        };
        setTimeout(loadAttachments, 500); // Wait 500ms for attachments to be inserted

        // Scroll to bottom when new message arrives
        setTimeout(() => scrollToBottom(true), 100);
      } else if (event === 'update') {
        // Message updated (reactions, read status, etc.)
        setMessages((currentMessages) =>
          sortMessagesAscending(
            currentMessages.map((message) => (message.id === newMessage.id ? { ...message, ...newMessage } : message))
          )
        );
      } else if (event === 'delete') {
        // Message deleted
        setMessages((currentMessages) => currentMessages.filter((message) => message.id !== newMessage.id));
      }
    };

    if (isGroup) {
      unsubscribe = subscribeToGroupMessages(groupId, handleMessageEvent);
    } else if (currentUserId && contactId) {
      unsubscribe = subscribeToDirectMessages(currentUserId, contactId, handleMessageEvent);
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [hasConversation, isGroup, contactId, groupId, currentUserId, scrollToBottom]);

  const openMessageActions = useCallback((message) => {
    setActionMessage(message);
    setShowActions(true);
  }, []);

  const closeMessageActions = useCallback(() => {
    setShowActions(false);
    setActionMessage(null);
  }, []);

  const handleReact = useCallback(async (emoji) => {
    if (!actionMessage) {
      return;
    }

    try {
      // Optimistically update local state
      setMessages((currentMessages) =>
        currentMessages.map((message) => {
          if (message.id !== actionMessage.id) return message;

          const nextReactions = { ...(message.reactions || {}) };
          nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;

          // Fire update to Supabase
          (async () => {
            try {
              if (isGroup) {
                await updateGroupMessageReactions(actionMessage.id, nextReactions);
              } else {
                await supabase.from('messages').update({ reactions: nextReactions }).eq('id', actionMessage.id);
              }
            } catch (err) {
              console.warn('[Convo] Failed to persist reaction:', err?.message || err);
            }
          })();

          return { ...message, reactions: nextReactions };
        })
      );
    } catch (error) {
      console.error('Failed to react to message:', error);
      ThemedAlert.alert('Error', 'Could not add reaction.');
    } finally {
      setShowReactionPicker(false);
      closeMessageActions();
    }
  }, [actionMessage, closeMessageActions, groupId, isGroup]);

  const handleReply = useCallback(() => {
    if (!actionMessage) {
      return;
    }

    setReplyTo({
      ...actionMessage,
      sender_name: actionMessage?.sender_name ?? actionMessage?.sender?.name ?? conversationName,
      isOutgoing: Boolean(actionMessage?.localStatus) || (currentUserId != null && String(actionMessage?.sender_id ?? actionMessage?.user_id ?? actionMessage?.sender?.id ?? '') === String(currentUserId)),
    });
    closeMessageActions();
  }, [actionMessage, closeMessageActions, conversationName, currentUserId]);

  const handleSwipeReply = useCallback((message) => {
    if (!message) {
      return;
    }

    setReplyTo({
      ...message,
      sender_name: message?.sender_name ?? message?.sender?.name ?? conversationName,
      isOutgoing: Boolean(message?.localStatus) || (currentUserId != null && String(message?.sender_id ?? message?.user_id ?? message?.sender?.id ?? '') === String(currentUserId)),
    });
  }, [conversationName, currentUserId]);

  const handleDeleteMessage = useCallback(async () => {
    if (!actionMessage || !currentUserId) {
      return;
    }

    try {
      if (isGroup) {
        await deleteGroupMessage(actionMessage.id, currentUserId);
      } else {
        await deleteDirectMessage(actionMessage.id, currentUserId);
      }

      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== actionMessage.id));
    } catch (error) {
      console.error('Failed to delete message:', error);
      ThemedAlert.alert('Error', 'Could not delete message.');
    } finally {
      closeMessageActions();
    }
  }, [actionMessage, closeMessageActions, currentUserId, groupId, isGroup]);

  const handleAttach = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        ThemedAlert.alert('Permission required', 'Please allow access to your photos to send an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedAttachmentUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      ThemedAlert.alert('Error', 'Could not open image library.');
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedDraft = draft.trim();

    if ((!trimmedDraft && !selectedAttachmentUri) || isSending || !hasConversation) {
      return;
    }

    const attachments = selectedAttachmentUri ? [selectedAttachmentUri] : [];

    const temporaryMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: temporaryMessageId,
      content: trimmedDraft,
      reply_to: replyTo?.id ?? null,
      sender_id: currentUserId ?? 'local-user',
      created_at: new Date().toISOString(),
      localStatus: 'sending',
      attachments: attachments.map((uri) => ({ attachment_path: uri, isLocal: true })),
    };

    setMessages((currentMessages) => sortMessagesAscending([...currentMessages, optimisticMessage]));
    setDraft('');
    setSelectedAttachmentUri(null);
    setReplyTo(null);
    setIsSending(true);
    updateTypingStatus(false);

    try {
      let sentMessage = null;

      if (isGroup) {
        sentMessage = await sendGroupMessage(groupId, currentUserId, trimmedDraft, attachments);
      } else {
        sentMessage = await sendDirectMessage(currentUserId, contactId, trimmedDraft, attachments);
      }

      // We explicitly set content: trimmedDraft so the sender sees their readable text, not the cipher!
      const confirmedMessage = sentMessage && typeof sentMessage === 'object'
        ? { ...optimisticMessage, ...sentMessage, content: trimmedDraft, localStatus: 'sent' }
        : { ...optimisticMessage, localStatus: 'sent' };

      setMessages((currentMessages) =>
        sortMessagesAscending(
          currentMessages.map((message) => (
            message.id === temporaryMessageId ? confirmedMessage : message
          ))
        )
      );
    } catch (error) {
      console.error('Send failed:', error);
      setMessages((currentMessages) =>
        currentMessages.map((message) => (
          message.id === temporaryMessageId
            ? { ...message, localStatus: 'failed' }
            : message
        ))
      );
      ThemedAlert.alert('Failed', 'Message could not be sent.');
    } finally {
      setIsSending(false);
    }
  }, [contactId, currentUserId, draft, groupId, hasConversation, isGroup, isSending, replyTo, selectedAttachmentUri, updateTypingStatus]);

  const renderMessageItem = useCallback(({ item, index }) => {
    const senderId = item?.sender_id ?? item?.user_id ?? item?.sender?.id ?? item?.sender?.user_id ?? null;
    const isOutgoing = Boolean(item?.localStatus) || (currentUserId != null && senderId != null && String(senderId) === String(currentUserId));
    const senderName = item?.sender?.first_name ?? item?.sender?.name ?? item?.sender_name ?? conversationName;
    const senderAvatar = getAvatarUri(senderName, item?.sender?.alumni_photo ?? item?.sender_avatar ?? conversationAvatar);
    const currentMessageDate = getMessageDate(item);
    const previousMessageDate = getMessageDate(messagesRef.current[index - 1]);
    const showMessageTime = !isSameMinute(currentMessageDate, previousMessageDate);
    const messageTime = showMessageTime ? formatMessageTime(currentMessageDate) : '';
    const sendStatus = item?.localStatus ?? null;

    const decryptedItem = { ...item };

    return (
      <MessageBubble
        message={decryptedItem} 
        isOutgoing={isOutgoing}
        showAvatar={!isOutgoing}
        senderAvatar={senderAvatar}
        onLongPress={() => openMessageActions(decryptedItem)} // Pass decrypted item so replies show readable text
        onSwipeReply={handleSwipeReply}
        onMentionPress={handleMentionPress}
        read={Boolean(item?.read_at)}
        messageTime={messageTime}
        sendStatus={sendStatus}
      />
    );
  }, [allowMentions, conversationAvatar, conversationName, currentUserId, handleMentionPress, handleSwipeReply, openMessageActions]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyConversationState}>
      <Ionicons name="chatbubble-ellipses-outline" size={44} color="#8AA0E8" />
      <Text style={styles.emptyConversationTitle}>Start the conversation</Text>
      <Text style={styles.emptyConversationText}>
        Messages you send here will appear like an Instagram-style chat thread.
      </Text>
    </View>
  ), []);

  if (!hasConversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.chatHeader}>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#31429B" />
            </Pressable>
            <View style={styles.headerProfileWrap}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Conversation</Text>
                <Text style={styles.headerSubtitle}>Missing chat details</Text>
              </View>
            </View>
          </View>
          <View style={styles.loadingState}>
            <Text style={styles.emptyConversationTitle}>No conversation selected</Text>
            <Text style={styles.emptyConversationText}>
              Open this screen from a contact or message thread.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <CustomKeyboardView
        footer={(
          <View style={styles.composerFooterWrap}>
            {mentionContext && mentionSuggestions.length > 0 ? (
              <View style={styles.mentionPanel}>
                {mentionSuggestions.map((item, index) => (
                  <Pressable
                    key={`${String(item.id ?? item.name)}-${index}`}
                    style={styles.mentionItem}
                    onPress={() => handleMentionPick(item.handle)}
                  >
                    <Image source={{ uri: item.avatar }} style={styles.mentionAvatar} />
                    <Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
                  </Pressable>
                ))} 
              </View>
            ) : null}

            {typingLabel ? (
              <View style={styles.typingIndicatorRow}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingText} numberOfLines={1}>{typingLabel}</Text>
                </View>
              </View>
            ) : null}

            {selectedAttachmentUri ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row' }}>
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: selectedAttachmentUri }}
                    style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#E5E7EB' }}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12 }}
                    onPress={() => setSelectedAttachmentUri(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <MessageInputBar
              value={draft}
              onChangeText={setDraft}
              onSend={handleSend}
              onAttach={handleAttach}
              onEmoji={() => setDraft((currentDraft) => `${currentDraft} 😊`)}
              disabled={isSending}
              isReplying={Boolean(replyTo)}
              onCancelReply={() => setReplyTo(null)}
              replyTo={replyTo}
              hasAttachment={Boolean(selectedAttachmentUri)}
            />
          </View>
        )}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <ChatHeader
              title={conversationName}
              subtitle={headerSubtitle}
              avatarUri={getAvatarUri(conversationName, conversationAvatar)}
              onBackPress={() => navigation.goBack()}
              onProfilePress={() => {}}
              onCallPress={() => {}}
              onVideoPress={() => {}}
              onInfoPress={() => {
                if (isGroup) {
                  navigation.navigate('ChatDetailsScreen', {
                    group: {
                      id: groupId,
                      name: conversationName,
                      avatar: getAvatarUri(conversationName, conversationAvatar),
                      members: groupMembers,
                      media: [],
                    },
                  });
                  return;
                }

                navigation.navigate('ChatDetailsScreen', {
                  contact: {
                    id: contactId,
                    name: params.contactName ?? params.userName ?? params.contact?.name ?? conversationName,
                    first_name: params.contactFirstName ?? params.contact?.first_name ?? '',
                    last_name: params.contactLastName ?? params.contact?.last_name ?? '',
                    username: params.contactUsername ?? params.contact?.username ?? null,
                    avatar: params.contactAvatar ?? conversationAvatar,
                    alumni_photo: params.contactPhoto ?? params.contact?.alumni_photo ?? null,
                  },
                });
              }}
            />

            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item, index) => String(item?.id ?? item?.tempId ?? item?.localId ?? item?.created_at ?? index)}
              initialNumToRender={14}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              windowSize={8}
              removeClippedSubviews
              contentContainerStyle={messages.length > 0 ? styles.messagesContent : [styles.messagesContent, { flexGrow: 1 }]}
              ListEmptyComponent={renderEmptyState}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.chatBody}
              onContentSizeChange={() => {
                if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false });
              }}
              onLayout={() => {
                if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false });
              }}
            />

            <Modal
              visible={showActions}
              transparent
              animationType="fade"
              onRequestClose={closeMessageActions}
            >
              <View style={styles.reactionPickerOverlay}>
                <View style={styles.reactionPickerContent}>
                  <Text style={styles.reactionPickerTitle}>Message actions</Text>

                  <TouchableOpacity style={styles.reactionPickerEmoji} onPress={handleReply}>
                    <Text style={styles.reactionPickerEmojiText}>Reply</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.reactionPickerEmoji} onPress={() => setShowReactionPicker(true)}>
                    <Text style={styles.reactionPickerEmojiText}>React</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.reactionPickerEmoji} onPress={handleDeleteMessage}>
                    <Text style={styles.reactionPickerEmojiText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.reactionPickerClose} onPress={closeMessageActions}>
                    <Text style={styles.reactionPickerCloseText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showReactionPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowReactionPicker(false)}
            >
              <View style={styles.reactionPickerOverlay}>
                <View style={styles.reactionPickerContent}>
                  <Text style={styles.reactionPickerTitle}>React to message</Text>
                  <View style={styles.reactionPickerRow}>
                    {REACTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.reactionPickerEmoji}
                        onPress={() => handleReact(emoji)}
                      >
                        <Text style={styles.reactionPickerEmojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.reactionPickerClose} onPress={() => setShowReactionPicker(false)}>
                    <Text style={styles.reactionPickerCloseText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        </TouchableWithoutFeedback>
      </CustomKeyboardView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  attachmentImage: {
    width: Math.min(SCREEN_WIDTH * 0.72, 280),
    height: Math.min(SCREEN_WIDTH * 0.72, 280),
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#E5E7EB',
  },
  messageAvatarSpacer: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  messageColumn: {
    flexShrink: 1,
    maxWidth: '76%',
  },
  bottomSafeArea: {
    backgroundColor: 'transparent',
  },
  seenText: {
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});