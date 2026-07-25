import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  LogBox,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeModules,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
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
} from "../services/messageQueries";
import {
  subscribeToDirectMessages,
  subscribeToGroupMessages,
} from "../services/realtimeMessageService";
import { getAvatarUri } from "../utils/imageUtils";
import styles from "../styles/ConvoScreen.styles";
import ChatHeader from "../components/ChatHeader";
import MessageBubble from "../components/MessageBubble";
import MessageInputBar from "../components/MessageInputBar";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import { ThemedAlert } from "../components/ThemedAlert";
import { sendPushNotification } from "../services/NotificationSender";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MESSAGE_LIMIT = 30;

LogBox.ignoreLogs([
  "VirtualizedList: You have a large list that is slow to update",
]);

// ---------- helper functions ----------
const toMentionHandle = (firstName, lastName) => {
  const normalizedHandle = `${firstName ?? ""}_${lastName ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9_.-]/g, " ")
    .replace(/ +/g, " ")
    .replace(/^ +|_+$/g, " ");
  return normalizedHandle || "alumni";
};

const normalizeMentionLookup = (value) =>
  String(value ?? " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/ +/g, " ")
    .replace(/^ +|_+$/g, " ");

const normalizeMentionName = (firstName, lastName) => {
  const first = normalizeMentionLookup(firstName);
  const last = normalizeMentionLookup(lastName).replace(
    /(jr|sr|ii|iii|iv|v|junior|senior)$/g,
    "",
  );
  return [first, last].filter(Boolean).join("");
};

const extractMentionQuery = (value) => {
  const text = String(value ?? "");
  const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;
  const query = match[2] ?? "";
  const mentionStart = text.length - query.length - 1;
  return { query, mentionStart, mentionEnd: text.length };
};

const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${dateStr} at ${timeStr}`;
};

const getMessageDate = (message) => {
  const rawValue = message?.created_at ?? message?.sent_at ?? message?.updated_at;
  if (!rawValue) return null;
  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sortMessagesDescending = (messageList) => {
  return [...(Array.isArray(messageList) ? messageList : [])].sort(
    (firstMessage, secondMessage) => {
      const firstDate = getMessageDate(firstMessage);
      const secondDate = getMessageDate(secondMessage);
      if (firstDate && secondDate) {
        const diff = secondDate.getTime() - firstDate.getTime();
        if (diff !== 0) return diff;
      } else if (firstDate && !secondDate) {
        return -1;
      } else if (!firstDate && secondDate) {
        return 1;
      }
      const firstId = String(firstMessage?.id ?? "");
      const secondId = String(secondMessage?.id ?? "");
      return secondId.localeCompare(firstId);
    },
  );
};

// ---------- main component ----------
export default function ConvoScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const { refreshUnreadMessages } = useUnreadMessages();
  const params = route?.params ?? {};
  const contactId =
    params.contactId ??
    params.userId ??
    params.id ??
    params.contact?.id ??
    null;
  const groupId = params.groupId ?? params.group?.id ?? null;
  const isGroup = Boolean(groupId && !contactId);
  const conversationName =
    params.contactName ??
    params.userName ??
    params.contact?.name ??
    params.groupName ??
    params.group?.name ??
    "Chat";
  const conversationAvatar =
    params.contactAvatar ??
    params.userAvatarUri ??
    params.contactPhoto ??
    params.avatar ??
    params.contact?.avatar ??
    params.groupAvatar ??
    params.group?.avatar ??
    "";
  const conversationStatus = params.contactStatus ?? params.status ?? "";
  const groupMembers = Array.isArray(params.groupMembers)
    ? params.groupMembers
    : Array.isArray(params.group?.members)
    ? params.group.members
    : [];

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedAttachmentUri, setSelectedAttachmentUri] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [connections, setConnections] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const typingChannelRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());
  const isLoadingMoreRef = useRef(false);

  const hasConversation = Boolean(contactId || groupId);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Track keyboard state strictly for seamless padding adjustment
  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const typingChannelKey = useMemo(() => {
    if (!hasConversation || !currentUserId) return null;
    if (isGroup) return `typing:group:${groupId}`;
    const participants = [currentUserId, contactId]
      .filter((v) => v != null && v !== "")
      .map((v) => String(v))
      .sort();
    if (participants.length !== 2) return null;
    return `typing:dm:${participants.join(":")}`;
  }, [contactId, currentUserId, groupId, hasConversation, isGroup]);

  const allowMentions = true;

  const headerSubtitle = isGroup
    ? groupMembers
        .map((m) => m?.name)
        .filter(Boolean)
        .join(", ") || "Group chat"
    : conversationStatus || "Active now";

  const mentionContext = useMemo(
    () => (allowMentions ? extractMentionQuery(draft) : null),
    [allowMentions, draft],
  );

  const mentionableUsers = useMemo(() => {
    const usersMap = new Map();
    (connections || []).forEach((c) => {
      if (c?.id) usersMap.set(c.id, c);
    });
    if (isGroup && Array.isArray(groupMembers)) {
      groupMembers.forEach((member) => {
        const alumni = member?.alumni ?? member;
        if (alumni?.id) usersMap.set(alumni.id, alumni);
      });
    }
    return Array.from(usersMap.values());
  }, [connections, groupMembers, isGroup]);

  const mentionSuggestions = useMemo(() => {
    if (!allowMentions || !mentionContext) return [];
    const query = mentionContext.query.toLowerCase();
    return (mentionableUsers || [])
      .map((user) => {
        const first = user?.first_name ?? "";
        const last = user?.last_name ?? "";
        const name = `${first} ${last}`.trim() || "Alumni";
        return {
          id: user?.id,
          name,
          handle: toMentionHandle(first, last),
          avatar: getAvatarUri(name, user?.alumni_photo),
        };
      })
      .filter((item) => {
        if (!query) return true;
        return item.name.toLowerCase().includes(query) || item.handle.includes(query);
      })
      .slice(0, 5);
  }, [allowMentions, mentionableUsers, mentionContext]);

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) return " ";
    const names = typingUsers
      .map((u) => `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim())
      .filter(Boolean);
    if (names.length === 0) return isGroup ? "Someone is typing..." : `${conversationName} is typing...`;
    if (isGroup) {
      if (names.length === 1) return `${names[0]} is typing...`;
      if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
      return "Several people are typing...";
    }
    return `${names[0]} is typing...`;
  }, [conversationName, isGroup, typingUsers]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const supaUser = await getCurrentUser();
      if (!supaUser) return;
      setCurrentUserId(supaUser.id);
      setCurrentUserProfile(supaUser);
      try {
        const { getFollowing } = await import("../services/connectionQueries");
        const following = await getFollowing(supaUser.id).catch(() => []);
        setConnections(
          Array.isArray(following) ? following.map((f) => f.followed ?? f) : [],
        );
      } catch (e) {
        setConnections([]);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
      setConnections([]);
    }
  }, []);

  const updateTypingStatus = useCallback(
    async (isTyping) => {
      if (!hasConversation || !typingChannelRef.current || !currentUserId) return;
      if (!isTyping) {
        setTypingUsers((prev) =>
          prev.filter((u) => String(u?.id ?? u?.alumni_id ?? "") !== String(currentUserId)),
        );
      }
      try {
        await typingChannelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: {
            userId: currentUserId,
            first_name: currentUserProfile?.first_name ?? " ",
            last_name: currentUserProfile?.last_name ?? " ",
            alumni_photo: currentUserProfile?.alumni_photo ?? null,
            isTyping: Boolean(isTyping),
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        console.warn("[Convo] Failed to broadcast typing status: ", error?.message || error);
      }
    },
    [currentUserId, currentUserProfile, hasConversation],
  );

  const loadTypingStatus = useCallback(async () => {
    if (!hasConversation) {
      setTypingUsers([]);
      return;
    }
    setTypingUsers([]);
  }, [hasConversation]);

  const handleMentionPick = useCallback(
    (handle) => {
      if (!allowMentions || !mentionContext) return;
      setDraft((current) => {
        const safe = String(current ?? "");
        const prefix = safe.slice(0, mentionContext.mentionStart);
        const suffix = safe.slice(mentionContext.mentionEnd);
        return `${prefix}@${handle} ${suffix}`;
      });
    },
    [allowMentions, mentionContext],
  );

  const handleMentionPress = useCallback(
    async (token) => {
      if (!allowMentions) return;
      const handle = String(token ?? "").replace(/^@/, "").toLowerCase();
      if (!handle) return;
      const matchedLocal = (mentionableUsers || []).find(
        (u) => toMentionHandle(u?.first_name, u?.last_name) === handle,
      );
      if (matchedLocal?.id) {
        const parent = navigation.getParent?.();
        (parent?.navigate ?? navigation.navigate)("ProfileView", { userId: matchedLocal.id });
        return;
      }
    },
    [allowMentions, mentionableUsers, navigation],
  );

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!hasConversation) {
        setMessages([]);
        setPageOffset(0);
        setHasMoreMessages(true);
        setIsLoading(false);
        return;
      }

      if (!silent && messages.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        let messageList = [];
        const receiverType = params.receiverType || 'alumni';
        if (isGroup) {
          messageList = await getGroupMessages(groupId, currentUserId, MESSAGE_LIMIT, 0).catch(() => []);
        } else {
          if (!currentUserId) {
            setMessages([]);
            setIsLoading(false);
            return;
          }
          messageList = await getDirectMessages(currentUserId, contactId, MESSAGE_LIMIT, 0, receiverType).catch(() => []);
        }

        const hasMore = messageList.length >= MESSAGE_LIMIT;
        setHasMoreMessages(hasMore);
        setPageOffset(0);

        const unique = Array.from(
          messageList.reduce((map, msg) => {
            map.set(String(msg.id), msg);
            return map;
          }, new Map()).values()
        );
        setMessages(sortMessagesDescending(unique));

        // mark as read
        if (isGroup && currentUserId) {
          const latestId = Math.max(...messageList.map((m) => Number(m?.id ?? 0)).filter(Boolean));
          if (latestId > 0) {
            await markGroupChatAsRead(groupId, currentUserId, latestId).catch(() => {});
            await refreshUnreadMessages().catch(() => {});
          }
        } else if (!isGroup && currentUserId) {
          const unreadIds = messageList
            .filter((m) => m?.sender_id === contactId && m?.receiver_id === currentUserId && !m.is_read)
            .map((m) => m.id)
            .filter(Boolean);
          if (unreadIds.length) {
            await markMessagesAsRead(unreadIds).catch(() => {});
            await refreshUnreadMessages().catch(() => {});
          }
        }
      } catch (error) {
        console.error("Failed to load conversation messages:", error);
        if (!silent) ThemedAlert.alert("Error", "Could not load messages.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [contactId, currentUserId, groupId, hasConversation, isGroup, params.receiverType, refreshUnreadMessages, messages.length],
  );

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useFocusEffect(
    useCallback(() => {
      loadMessages(true);
      loadTypingStatus();
      return () => updateTypingStatus(false);
    }, [loadMessages, loadTypingStatus, updateTypingStatus]),
  );

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasMoreMessages || isRefreshing || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsFetchingMore(true);
    try {
      const nextOffset = pageOffset + MESSAGE_LIMIT;
      let newBatch = [];
      const receiverType = params.receiverType || 'alumni';
      if (isGroup) {
        newBatch = await getGroupMessages(groupId, currentUserId, MESSAGE_LIMIT, nextOffset).catch(() => []);
      } else {
        if (!currentUserId) return;
        newBatch = await getDirectMessages(currentUserId, contactId, MESSAGE_LIMIT, nextOffset, receiverType).catch(() => []);
      }

      if (newBatch.length < MESSAGE_LIMIT) setHasMoreMessages(false);
      if (newBatch.length > 0) {
        setMessages((prev) => {
          const map = new Map();
          prev.forEach((msg) => map.set(String(msg.id), msg));
          newBatch.forEach((msg) => map.set(String(msg.id), msg));
          return sortMessagesDescending(Array.from(map.values()));
        });
        setPageOffset(nextOffset);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsFetchingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [
    contactId, currentUserId, groupId, hasConversation, hasMoreMessages,
    isFetchingMore, isGroup, isRefreshing, pageOffset, params.receiverType,
  ]);

  useEffect(() => {
    if (!hasConversation) return;
    let unsubscribe = () => {};

    const handleMessageEvent = (event, newMessage) => {
      if (!newMessage) return;
      const isRelevant =
        isGroup ||
        (newMessage.sender_id === currentUserId && newMessage.receiver_id === contactId) ||
        (newMessage.sender_id === contactId && newMessage.receiver_id === currentUserId);
      if (!isRelevant) return;

      if (event === "insert") {
        // We completely ignore the 'insert' event for our OWN messages now. 
        // handleSend() will seamlessly insert the message with the fully loaded image attachment itself.
        if (String(newMessage.sender_id) === String(currentUserId)) {
          return;
        }

        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(newMessage.id))) return prev;
          return [newMessage, ...prev];
        });

        setTimeout(() => {
          getMessageAttachments(newMessage.id)
            .then((atts) => {
              if (atts.length) {
                setMessages((prev) =>
                  prev.map((m) =>
                    String(m.id) === String(newMessage.id) ? { ...m, attachments: atts } : m,
                  ),
                );
              }
            })
            .catch(() => {});
        }, 300);
      } else if (event === "update") {
        setMessages((prev) =>
          sortMessagesDescending(
            prev.map((m) => (String(m.id) === String(newMessage.id) ? { ...m, ...newMessage } : m)),
          ),
        );
      } else if (event === "delete") {
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(newMessage.id)));
      }
    };

    if (isGroup) {
      unsubscribe = subscribeToGroupMessages(groupId, handleMessageEvent);
    } else if (currentUserId && contactId) {
      unsubscribe = subscribeToDirectMessages(currentUserId, contactId, handleMessageEvent);
    }

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [hasConversation, isGroup, contactId, groupId, currentUserId]);

  useEffect(() => {
    if (!typingChannelKey || !currentUserId) {
      typingChannelRef.current = null;
      setTypingUsers([]);
      return () => {};
    }
    const channel = supabase.channel(typingChannelKey);
    const handleTyping = ({ payload }) => {
      const senderId = payload?.userId ?? payload?.user_id ?? null;
      if (!senderId || String(senderId) === String(currentUserId)) return;
      const user = {
        id: senderId,
        first_name: payload?.first_name ?? " ",
        last_name: payload?.last_name ?? " ",
        alumni_photo: payload?.alumni_photo ?? null,
        isTyping: Boolean(payload?.isTyping),
      };
      const key = String(senderId);
      if (typingTimeoutsRef.current.has(key)) {
        clearTimeout(typingTimeoutsRef.current.get(key));
        typingTimeoutsRef.current.delete(key);
      }
      if (user.isTyping) {
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => String(u.id ?? u.alumni_id) !== key);
          return [...filtered, user];
        });
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => String(u.id ?? u.alumni_id) !== key));
          typingTimeoutsRef.current.delete(key);
        }, 2500);
        typingTimeoutsRef.current.set(key, timeout);
      } else {
        setTypingUsers((prev) => prev.filter((u) => String(u.id ?? u.alumni_id) !== key));
      }
    };
    channel.on("broadcast", { event: "typing" }, handleTyping).subscribe();
    typingChannelRef.current = channel;
    return () => {
      typingChannelRef.current = null;
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
      setTypingUsers([]);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, typingChannelKey]);

  const openMessageActions = useCallback((message) => {
    setActionMessage(message);
    setShowActions(true);
  }, []);

  const closeMessageActions = useCallback(() => {
    setShowActions(false);
    setActionMessage(null);
  }, []);

  const handleReact = useCallback(
    async (emoji) => {
      if (!actionMessage) return;
      try {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== actionMessage.id) return msg;
            const nextReactions = { ...(msg.reactions || {}) };
            nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;
            (async () => {
              try {
                if (isGroup) {
                  await updateGroupMessageReactions(actionMessage.id, nextReactions);
                } else {
                  await supabase
                    .from("messages")
                    .update({ reactions: nextReactions })
                    .eq("id", actionMessage.id);
                }
              } catch (err) {
                console.warn("Reaction persist error: ", err);
              }
            })();
            return { ...msg, reactions: nextReactions };
          }),
        );
      } catch (error) {
        console.error("Reaction failed: ", error);
        ThemedAlert.alert("Error", "Could not add reaction.");
      } finally {
        setShowReactionPicker(false);
        closeMessageActions();
      }
    },
    [actionMessage, closeMessageActions, isGroup],
  );

  const handleReply = useCallback(() => {
    if (!actionMessage) return;
    setReplyTo({
      ...actionMessage,
      sender_name:
        actionMessage?.sender_name ??
        actionMessage?.sender?.name ??
        conversationName,
      isOutgoing:
        Boolean(actionMessage?.localStatus) ||
        (currentUserId != null &&
          String(actionMessage?.sender_id ?? actionMessage?.user_id ?? "") === String(currentUserId)),
    });
    closeMessageActions();
  }, [actionMessage, closeMessageActions, conversationName, currentUserId]);

  const handleSwipeReply = useCallback(
    (message) => {
      if (!message) return;
      setReplyTo({
        ...message,
        sender_name: message?.sender_name ?? message?.sender?.name ?? conversationName,
        isOutgoing:
          Boolean(message?.localStatus) ||
          (currentUserId != null &&
            String(message?.sender_id ?? message?.user_id ?? "") === String(currentUserId)),
      });
    },
    [conversationName, currentUserId],
  );

  const handleDeleteMessage = useCallback(async () => {
    if (!actionMessage || !currentUserId) return;
    try {
      if (isGroup) {
        await deleteGroupMessage(actionMessage.id, currentUserId);
      } else {
        await deleteDirectMessage(actionMessage.id, currentUserId);
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== actionMessage.id));
    } catch (error) {
      console.error("Delete failed:", error);
      ThemedAlert.alert("Error", "Could not delete message.");
    } finally {
      closeMessageActions();
    }
  }, [actionMessage, closeMessageActions, currentUserId, groupId, isGroup]);

  const handleAttach = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        ThemedAlert.alert("Permission required", "Please allow access to your photos to send an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedAttachmentUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error: ", error);
      ThemedAlert.alert("Error", "Could not open image library.");
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if ((!trimmed && !selectedAttachmentUri) || isSending || !hasConversation) return;
    
    setIsSending(true);
    setDraft("");
    const currentAttachmentUri = selectedAttachmentUri;
    setSelectedAttachmentUri(null);
    setReplyTo(null);
    updateTypingStatus(false);

    const receiverType = params.receiverType || 'alumni';
    const senderType = 'alumni';
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const optimistic = {
      id: tempId,
      content: trimmed,
      reply_to: replyTo?.id ?? null,
      sender_id: currentUserId ?? "local-user",
      created_at: new Date().toISOString(),
      localStatus: "sending",
      sender_type: senderType,
      receiver_type: receiverType,
      attachments: currentAttachmentUri ? [{ attachment_path: currentAttachmentUri, isLocal: true }] : [],
    };
    
    setMessages((prev) => [optimistic, ...prev]);

    // Give messageQueries.js the raw file path, it will upload it itself!
    const attachmentsArray = currentAttachmentUri ? [currentAttachmentUri] : [];

    try {
      let sentMessage;
      if (isGroup) {
        sentMessage = await sendGroupMessage(groupId, currentUserId, trimmed, attachmentsArray);
      } else {
        sentMessage = await sendDirectMessage(currentUserId, contactId, trimmed, attachmentsArray, senderType, receiverType);
      }

      // Now that the backend upload is 100% finished, fetch the real public cloud URLs
      const finalAttachments = await getMessageAttachments(sentMessage.id);
      sentMessage.attachments = finalAttachments;

      // Swap the optimistic temp message out for the real fully-loaded one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId || m.id === sentMessage.id ? { ...sentMessage, localStatus: "sent" } : m)),
      );
    } catch (error) {
      console.error("Send failed:", error);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, localStatus: "failed" } : m)),
      );
      ThemedAlert.alert("Failed", "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }, [
    contactId, currentUserId, draft, groupId, hasConversation, isGroup,
    isSending, replyTo, selectedAttachmentUri, updateTypingStatus, params.receiverType,
  ]);

  const initiateCall = async (callType = "video") => {
    if (isGroup) {
      ThemedAlert.alert("Coming Soon", "Group calls are currently in development.");
      return;
    }
    if (!currentUserId || !contactId) return;
    if (!NativeModules?.WebRTCModule) {
      ThemedAlert.alert("Call Unavailable", "WebRTC is not available in this build.");
      return;
    }
    try {
      const { data: callData, error } = await supabase
        .from("calls")
        .insert({ caller_id: currentUserId, receiver_id: contactId, status: "ringing", type: callType })
        .select("id")
        .single();
      if (error) throw error;

      try {
        const { data: receiver } = await supabase
          .from("alumnis")
          .select("push_token, first_name, last_name")
          .eq("id", contactId)
          .single();
        if (receiver?.push_token) {
          const callerName = `${currentUserProfile?.first_name ?? "Someone"} ${currentUserProfile?.last_name ?? ""}`.trim();
          await sendPushNotification(
            [receiver.push_token],
            `${callerName} is calling you`,
            `Incoming ${callType} call.`,
            { screen: "IncomingCallScreen", type: "call", callId: callData.id, callerId: currentUserId, callType },
          );
        }
      } catch (pushErr) {
        console.warn("Push notification failed:", pushErr);
      }

      const rootNav = navigation.getParent?.();
      (rootNav?.navigate ?? navigation.navigate)("CallScreen", {
        callId: callData.id,
        currentUserId,
        isCaller: true,
        type: callType,
      });
    } catch (error) {
      console.error("Call initiation error:", error);
      ThemedAlert.alert("Call Failed", "Unable to connect to the server right now.");
    }
  };

  const renderMessageItem = useCallback(
    ({ item, index }) => {
      const senderId = item?.sender_id ?? item?.user_id ?? item?.sender?.id ?? null;
      const isOutgoing =
        Boolean(item?.localStatus) ||
        (currentUserId != null && senderId != null && String(senderId) === String(currentUserId));
      const senderName =
        item?.sender?.first_name ?? item?.sender?.name ?? item?.sender_name ?? conversationName;
      const senderAvatar = getAvatarUri(
        senderName,
        item?.sender?.alumni_photo ?? item?.sender_avatar ?? conversationAvatar,
      );
      const currentDate = getMessageDate(item);
      const messageTime = formatMessageTime(currentDate);

      return (
        <MessageBubble
          message={item}
          isOutgoing={isOutgoing}
          showAvatar={!isOutgoing}
          senderAvatar={senderAvatar}
          senderName={senderName}
          onLongPress={() => openMessageActions(item)}
          onSwipeReply={handleSwipeReply}
          onMentionPress={handleMentionPress}
          read={Boolean(item?.read_at)}
          messageTime={messageTime}
          sendStatus={item?.localStatus ?? null}
        />
      );
    },
    [
      conversationAvatar, conversationName, currentUserId,
      handleMentionPress, handleSwipeReply, openMessageActions,
    ],
  );

  const renderEmptyState = useCallback(() => {
    if (isLoading && messages.length === 0) {
      return (
        <View style={styles.emptyConversationState}>
          <View style={styles.emptyConversationFlipped}>
            <Pressable style={styles.emptyConversationLoadingButton} disabled>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.emptyConversationLoadingText}>Loading messages...</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.emptyConversationState}>
        <View style={styles.emptyConversationFlipped}>
          <Ionicons name="chatbubble-ellipses-outline" size={44} color="#8AA0E8" />
          <Text style={styles.emptyConversationTitle}>Start the conversation</Text>
          <Text style={styles.emptyConversationText}>
            Messages you send here will appear like an Instagram-style chat thread.
          </Text>
        </View>
      </View>
    );
  }, [isLoading, messages.length]);

  if (!hasConversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: "transparent", flex: 1 }]} edges={["top"]}>
        <View style={[styles.container, { flex: 1 }]}>
          <ChatHeader
            title={conversationName}
            subtitle={headerSubtitle}
            avatarUri={getAvatarUri(conversationName, conversationAvatar)}
            avatarName={isGroup ? (groupMembers.map((member) => member?.name).filter(Boolean).join(" ") || conversationName) : conversationName}
            onBackPress={() => navigation.goBack()}
            onProfilePress={() => {}}
            onCallPress={() => initiateCall("audio")}
            onVideoPress={() => initiateCall("video")}
            onInfoPress={() => {
              if (isGroup) {
                navigation.navigate("ChatDetailsScreen", {
                  group: { id: groupId, name: conversationName, avatar: getAvatarUri(conversationName, conversationAvatar), members: groupMembers, media: [] },
                });
                return;
              }
              navigation.navigate("ChatDetailsScreen", {
                contact: {
                  id: contactId,
                  name: conversationName,
                  first_name: params.contactFirstName ?? params.contact?.first_name ?? " ",
                  last_name: params.contactLastName ?? params.contact?.last_name ?? " ",
                  username: params.contactUsername ?? params.contact?.username ?? null,
                  avatar: conversationAvatar,
                  alumni_photo: params.contactPhoto ?? params.contact?.alumni_photo ?? null,
                },
              });
            }}
          />

          {isRefreshing && (
            <ActivityIndicator
              size="small"
              color="#31429B"
              style={{ position: "absolute", top: 12, left: "50%", marginLeft: -12, zIndex: 10 }}
            />
          )}

          <FlatList
            ref={flatListRef}
            inverted={true}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item, index) => {
              const uniqueId = item?.id ?? item?.tempId ?? item?.localId ?? `msg-${index}`;
              return `${uniqueId}-${index}`;
            }}
            initialNumToRender={14}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={6}
            removeClippedSubviews
            contentContainerStyle={
              messages.length > 0
                ? styles.messagesContent
                : [styles.messagesContent, { flexGrow: 1 }]
            }
            ListEmptyComponent={renderEmptyState}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            style={styles.chatBody}
            onEndReached={() => loadMoreMessages()}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingMore ? (
                <ActivityIndicator size="small" color="#31429B" style={{ marginVertical: 12 }} />
              ) : null
            }
          />

          <View style={{ backgroundColor: "#FFFFFF", paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) }}>
            <View style={styles.composerFooterWrap}>
              {mentionContext && mentionSuggestions.length > 0 ? (
                <View style={styles.mentionPanel}>
                  {mentionSuggestions.map((item, idx) => (
                    <Pressable
                      key={`${item.id ?? item.name}-${idx}`}
                      style={styles.mentionItem}
                      onPress={() => handleMentionPick(item.handle)}
                    >
                      <Image source={{ uri: item.avatar }} style={styles.mentionAvatar} />
                      <Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {typingLabel && typingLabel !== " " ? (
                <View style={styles.typingIndicatorRow}>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText} numberOfLines={1}>{typingLabel}</Text>
                  </View>
                </View>
              ) : null}

              {selectedAttachmentUri ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row" }}>
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: selectedAttachmentUri }}
                      style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: "#E5E7EB" }}
                    />
                    <TouchableOpacity
                      style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#FFF", borderRadius: 12 }}
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
                onEmoji={() => setDraft((prev) => `${prev} 😊`)}
                disabled={isSending}
                isReplying={Boolean(replyTo)}
                onCancelReply={() => setReplyTo(null)}
                replyTo={replyTo}
                hasAttachment={Boolean(selectedAttachmentUri)}
              />
            </View>
          </View>
        </View>

        <Modal visible={showActions} transparent animationType="fade" onRequestClose={closeMessageActions}>
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

        <Modal visible={showReactionPicker} transparent animationType="fade" onRequestClose={() => setShowReactionPicker(false)}>
          <View style={styles.reactionPickerOverlay}>
            <View style={styles.reactionPickerContent}>
              <Text style={styles.reactionPickerTitle}>React to message</Text>
              <View style={styles.reactionPickerRow}>
                {REACTIONS.map((emoji) => (
                  <TouchableOpacity key={emoji} style={styles.reactionPickerEmoji} onPress={() => handleReact(emoji)}>
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}