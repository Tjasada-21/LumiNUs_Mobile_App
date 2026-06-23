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
  LogBox,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  NativeModules,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import CustomKeyboardView from "../components/CustomKeyboardView";
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

const toMentionHandle = (firstName, lastName) => {
  const normalizedHandle = `${firstName ?? ""}_${lastName ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalizedHandle || "alumni";
};

const normalizeMentionLookup = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeMentionName = (firstName, lastName) => {
  const first = normalizeMentionLookup(firstName);
  const last = normalizeMentionLookup(lastName).replace(
    /_(jr|sr|ii|iii|iv|v|junior|senior)$/g,
    "",
  );

  return [first, last].filter(Boolean).join("_");
};

const extractMentionQuery = (value) => {
  const text = String(value ?? "");
  const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);

  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
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
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getMessageDate = (message) => {
  const rawValue =
    message?.created_at ?? message?.sent_at ?? message?.updated_at;

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

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getHours() === secondDate.getHours() &&
    firstDate.getMinutes() === secondDate.getMinutes()
  );
};

const sortMessagesDescending = (messageList) => {
  return [...(Array.isArray(messageList) ? messageList : [])].sort(
    (firstMessage, secondMessage) => {
      const firstDate = getMessageDate(firstMessage);
      const secondDate = getMessageDate(secondMessage);

      if (firstDate && secondDate) {
        const firstTime = firstDate.getTime();
        const secondTime = secondDate.getTime();

        if (firstTime !== secondTime) {
          return secondTime - firstTime;
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
        return secondIdNumeric - firstIdNumeric;
      }

      const firstId = String(firstMessage?.id ?? "");
      const secondId = String(secondMessage?.id ?? "");
      return secondId.localeCompare(firstId);
    },
  );
};

export default function ConvoScreen() {
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
  const typingDebounceRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());

  const hasConversation = Boolean(contactId || groupId);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const typingChannelKey = useMemo(() => {
    if (!hasConversation || !currentUserId) {
      return null;
    }

    if (isGroup) {
      return `typing:group:${groupId}`;
    }

    const participants = [currentUserId, contactId]
      .filter((value) => value != null && value !== "")
      .map((value) => String(value))
      .sort();

    if (participants.length !== 2) {
      return null;
    }

    return `typing:dm:${participants.join(":")}`;
  }, [contactId, currentUserId, groupId, hasConversation, isGroup]);

  const allowMentions = true; // Enabled for both DMs and Groups!
  const headerSubtitle = isGroup
    ? groupMembers
        .map((member) => member?.name)
        .filter(Boolean)
        .join(", ") || "Group chat"
    : conversationStatus || "Active now";

  const mentionContext = useMemo(
    () => (allowMentions ? extractMentionQuery(draft) : null),
    [allowMentions, draft],
  );

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

    return (mentionableUsers || [])
      .map((user) => {
        const firstName = user?.first_name ?? "";
        const lastName = user?.last_name ?? "";
        const fullName = `${firstName} ${lastName}`.trim() || "Alumni";
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
        return (
          item.name.toLowerCase().includes(query) || item.handle.includes(query)
        );
      })
      .slice(0, 5);
  }, [allowMentions, mentionableUsers, mentionContext]);

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) {
      return "";
    }

    const typingNames = typingUsers
      .map((user) =>
        `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim(),
      )
      .filter(Boolean);

    if (typingNames.length === 0) {
      return isGroup
        ? "Someone is typing..."
        : `${conversationName} is typing...`;
    }

    if (isGroup) {
      if (typingNames.length === 1) {
        return `${typingNames[0]} is typing...`;
      }

      if (typingNames.length === 2) {
        return `${typingNames[0]} and ${typingNames[1]} are typing...`;
      }

      return "Several people are typing...";
    }

    return `${typingNames[0]} is typing...`;
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

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasMoreMessages || isLoading || !hasConversation) {
      return;
    }

    try {
      setIsFetchingMore(true);

      const nextOffset = pageOffset + MESSAGE_LIMIT;
      let newBatch = [];

      if (isGroup) {
        newBatch = await getGroupMessages(
          groupId,
          currentUserId,
          MESSAGE_LIMIT,
          nextOffset,
        ).catch(() => []);
      } else {
        if (!currentUserId) {
          return;
        }
        newBatch = await getDirectMessages(
          currentUserId,
          contactId,
          MESSAGE_LIMIT,
          nextOffset,
        ).catch(() => []);
      }

      if (newBatch.length < MESSAGE_LIMIT) {
        setHasMoreMessages(false);
      }

      if (newBatch.length > 0) {
        setMessages((currentMessages) => {
          const messageMap = new Map(
            currentMessages.map((msg) => [msg.id, msg]),
          );
          newBatch.forEach((msg) => messageMap.set(msg.id, msg));

          return sortMessagesDescending(Array.from(messageMap.values()));
        });
        setPageOffset(nextOffset);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [
    contactId,
    currentUserId,
    groupId,
    hasConversation,
    hasMoreMessages,
    isFetchingMore,
    isGroup,
    isLoading,
    pageOffset,
  ]);

  const updateTypingStatus = useCallback(
    async (isTyping) => {
      if (!hasConversation || !typingChannelRef.current || !currentUserId)
        return;

      if (!isTyping) {
        setTypingUsers((currentTypingUsers) =>
          currentTypingUsers.filter(
            (user) =>
              String(user?.id ?? user?.alumni_id ?? "") !==
              String(currentUserId),
          ),
        );
      }

      try {
        await typingChannelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: {
            userId: currentUserId,
            first_name: currentUserProfile?.first_name ?? "",
            last_name: currentUserProfile?.last_name ?? "",
            alumni_photo: currentUserProfile?.alumni_photo ?? null,
            isTyping: Boolean(isTyping),
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        console.warn(
          "[Convo] Failed to broadcast typing status:",
          error?.message || error,
        );
      }
    },
    [
      currentUserId,
      currentUserProfile?.alumni_photo,
      currentUserProfile?.first_name,
      currentUserProfile?.last_name,
      hasConversation,
    ],
  );

  const loadTypingStatus = useCallback(async () => {
    if (!hasConversation) {
      setTypingUsers([]);
      return;
    }

    setTypingUsers([]);
  }, [hasConversation]);

  const handleMentionPick = useCallback(
    (mentionHandle) => {
      if (!allowMentions || !mentionContext) {
        return;
      }

      setDraft((currentDraft) => {
        const safeText = String(currentDraft ?? "");
        const prefix = safeText.slice(0, mentionContext.mentionStart);
        const suffix = safeText.slice(mentionContext.mentionEnd);
        return `${prefix}@${mentionHandle} ${suffix}`;
      });
    },
    [allowMentions, mentionContext],
  );

  const handleMentionPress = useCallback(
    async (token) => {
      if (!allowMentions) return;

      const mentionHandle = String(token ?? "")
        .replace(/^@/, "")
        .toLowerCase();
      if (!mentionHandle) return;

      const matchedLocal = (mentionableUsers || []).find((user) => {
        return (
          toMentionHandle(user?.first_name, user?.last_name) === mentionHandle
        );
      });

      if (matchedLocal?.id) {
        const parentNavigator = navigation.getParent?.();
        if (parentNavigator?.navigate) {
          parentNavigator.navigate("ProfileView", { userId: matchedLocal.id });
          return;
        }
        navigation.navigate("ProfileView", { userId: matchedLocal.id });
        return;
      }

      try {
        const parts = mentionHandle.split("_");
        const first = parts[0] ? `${parts[0]}%` : "%";
        const last = parts.length > 1 ? `%${parts.slice(1).join(" ")}%` : "%";

        const { data: directMatch, error: directError } = await supabase
          .from("alumnis")
          .select("id, first_name, last_name")
          .ilike("first_name", first)
          .ilike("last_name", last)
          .limit(1)
          .maybeSingle();

        if (directError) {
          throw directError;
        }

        const matchedDirect = directMatch?.id;
        if (matchedDirect) {
          const parentNavigator = navigation.getParent?.();
          if (parentNavigator?.navigate) {
            parentNavigator.navigate("ProfileView", { userId: matchedDirect });
            return;
          }
          navigation.navigate("ProfileView", { userId: matchedDirect });
          return;
        }

        const { data: candidates } = await supabase
          .from("alumnis")
          .select("id, first_name, last_name")
          .ilike("first_name", first)
          .limit(20);

        const normalizedHandle = normalizeMentionName(
          parts[0],
          parts.slice(1).join(" "),
        );
        const matchedFallback = (
          Array.isArray(candidates) ? candidates : []
        ).find((candidate) => {
          const candidateHandle = normalizeMentionName(
            candidate?.first_name,
            candidate?.last_name,
          );
          return candidateHandle === normalizedHandle;
        });

        if (matchedFallback?.id) {
          const parentNavigator = navigation.getParent?.();
          if (parentNavigator?.navigate) {
            parentNavigator.navigate("ProfileView", {
              userId: matchedFallback.id,
            });
            return;
          }
          navigation.navigate("ProfileView", { userId: matchedFallback.id });
        } else {
          ThemedAlert.alert(
            "Mention unavailable",
            `No profile found for @${mentionHandle}.`,
          );
        }
      } catch (e) {
        console.error("Failed to fetch mentioned user:", e);
      }
    },
    [allowMentions, mentionableUsers, navigation],
  );

  const loadMessages = useCallback(async () => {
    if (!hasConversation) {
      setMessages([]);
      setPageOffset(0);
      setHasMoreMessages(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageOffset(0);
    setHasMoreMessages(true);

    try {
      let messageList = [];

      if (isGroup) {
        messageList = await getGroupMessages(
          groupId,
          currentUserId,
          MESSAGE_LIMIT,
          0,
        ).catch(() => []);
      } else {
        if (!currentUserId) {
          setMessages([]);
          setIsLoading(false);
          return;
        }
        messageList = await getDirectMessages(
          currentUserId,
          contactId,
          MESSAGE_LIMIT,
          0,
        ).catch(() => []);
      }

      if (messageList.length < MESSAGE_LIMIT) {
        setHasMoreMessages(false);
      } else {
        setHasMoreMessages(true);
      }

      setPageOffset(0); 
      setMessages(sortMessagesDescending(messageList));

      if (isGroup && currentUserId) {
        try {
          const latestMessageId = (
            Array.isArray(messageList) ? messageList : []
          )
            .map((message) => Number(message?.id ?? 0))
            .filter((messageId) => Number.isFinite(messageId) && messageId > 0)
            .reduce(
              (highestId, messageId) => Math.max(highestId, messageId),
              0,
            );

          if (latestMessageId > 0) {
            await markGroupChatAsRead(
              groupId,
              currentUserId,
              latestMessageId,
            ).catch(() => {});
            await refreshUnreadMessages().catch(() => {});
          }
        } catch (e) {}
      }

      if (!isGroup && currentUserId) {
        try {
          const unreadIds = (Array.isArray(messageList) ? messageList : [])
            .filter(
              (m) =>
                m &&
                m.sender_id === contactId &&
                m.receiver_id === currentUserId &&
                !m.is_read,
            )
            .map((m) => m.id)
            .filter(Boolean);

          if (unreadIds.length > 0) {
            await markMessagesAsRead(unreadIds).catch(() => {});
            await refreshUnreadMessages().catch(() => {});
          }
        } catch (e) {}
      }
    } catch (error) {
      console.error("Failed to load conversation messages:", error);
      setMessages([]);
      ThemedAlert.alert("Error", "Could not load messages.");
    } finally {
      setIsLoading(false);
    }
  }, [
    contactId,
    currentUserId,
    groupId,
    hasConversation,
    isGroup,
    refreshUnreadMessages,
  ]);

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
    }, [
      currentUserId,
      isGroup,
      loadMessages,
      loadTypingStatus,
      updateTypingStatus,
    ]),
  );

  useEffect(() => {
    return undefined;
  }, [messages]);

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

  useEffect(() => {
    if (!hasConversation) {
      return;
    }

    let unsubscribe = () => {};

    const handleMessageEvent = (event, newMessage) => {
      if (!newMessage) {
        return;
      }

      if (event === "insert") {
        setMessages((currentMessages) => {
          const messageExistsById = currentMessages.some(
            (msg) => msg.id === newMessage.id,
          );
          if (messageExistsById) {
            return currentMessages;
          }

          const optimisticDuplicate = currentMessages.some(
            (msg) =>
              msg.sender_id === newMessage.sender_id &&
              msg.content === newMessage.content &&
              Math.abs(
                new Date(msg.created_at).getTime() -
                  new Date(newMessage.created_at).getTime(),
              ) < 1000,
          );
          if (optimisticDuplicate) {
            return currentMessages.map((msg) =>
              msg.sender_id === newMessage.sender_id &&
              msg.content === newMessage.content &&
              Math.abs(
                new Date(msg.created_at).getTime() -
                  new Date(newMessage.created_at).getTime(),
              ) < 1000
                ? newMessage
                : msg,
            );
          }

          return [newMessage, ...currentMessages];
        });

        const loadAttachments = async () => {
          const attachments = await getMessageAttachments(newMessage.id).catch(
            () => [],
          );
          if (attachments.length > 0) {
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === newMessage.id ? { ...msg, attachments } : msg,
              ),
            );
          }
        };
        setTimeout(loadAttachments, 500); 
      } else if (event === "update") {
        setMessages((currentMessages) =>
          sortMessagesDescending(
            currentMessages.map((message) =>
              message.id === newMessage.id
                ? { ...message, ...newMessage }
                : message,
            ),
          ),
        );
      } else if (event === "delete") {
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== newMessage.id),
        );
      }
    };

    if (isGroup) {
      unsubscribe = subscribeToGroupMessages(groupId, handleMessageEvent);
    } else if (currentUserId && contactId) {
      unsubscribe = subscribeToDirectMessages(
        currentUserId,
        contactId,
        handleMessageEvent,
      );
    }

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [hasConversation, isGroup, contactId, groupId, currentUserId]);

  useEffect(() => {
    if (!typingChannelKey || !currentUserId) {
      typingChannelRef.current = null;
      setTypingUsers([]);
      return () => {};
    }

    const channel = supabase.channel(typingChannelKey);

    const handleTypingBroadcast = ({ payload }) => {
      const senderId = payload?.userId ?? payload?.user_id ?? null;
      if (!senderId || String(senderId) === String(currentUserId)) {
        return;
      }

      const nextTypingUser = {
        id: senderId,
        first_name: payload?.first_name ?? "",
        last_name: payload?.last_name ?? "",
        alumni_photo: payload?.alumni_photo ?? null,
        isTyping: Boolean(payload?.isTyping),
      };

      const timeoutKey = String(senderId);
      const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutsRef.current.delete(timeoutKey);
      }

      if (nextTypingUser.isTyping) {
        setTypingUsers((currentTypingUsers) => {
          const remaining = currentTypingUsers.filter(
            (user) => String(user?.id ?? user?.alumni_id ?? "") !== timeoutKey,
          );
          return [...remaining, nextTypingUser];
        });

        const timeoutId = setTimeout(() => {
          setTypingUsers((currentTypingUsers) =>
            currentTypingUsers.filter(
              (user) =>
                String(user?.id ?? user?.alumni_id ?? "") !== timeoutKey,
            ),
          );
          typingTimeoutsRef.current.delete(timeoutKey);
        }, 2500);

        typingTimeoutsRef.current.set(timeoutKey, timeoutId);
      } else {
        setTypingUsers((currentTypingUsers) =>
          currentTypingUsers.filter(
            (user) => String(user?.id ?? user?.alumni_id ?? "") !== timeoutKey,
          ),
        );
      }
    };

    channel
      .on("broadcast", { event: "typing" }, handleTypingBroadcast)
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      typingChannelRef.current = null;
      typingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
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
      if (!actionMessage) {
        return;
      }

      try {
        setMessages((currentMessages) =>
          currentMessages.map((message) => {
            if (message.id !== actionMessage.id) return message;

            const nextReactions = { ...(message.reactions || {}) };
            nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;

            (async () => {
              try {
                if (isGroup) {
                  await updateGroupMessageReactions(
                    actionMessage.id,
                    nextReactions,
                  );
                } else {
                  await supabase
                    .from("messages")
                    .update({ reactions: nextReactions })
                    .eq("id", actionMessage.id);
                }
              } catch (err) {
                console.warn(
                  "[Convo] Failed to persist reaction:",
                  err?.message || err,
                );
              }
            })();

            return { ...message, reactions: nextReactions };
          }),
        );
      } catch (error) {
        console.error("Failed to react to message:", error);
        ThemedAlert.alert("Error", "Could not add reaction.");
      } finally {
        setShowReactionPicker(false);
        closeMessageActions();
      }
    },
    [actionMessage, closeMessageActions, groupId, isGroup],
  );

  const handleReply = useCallback(() => {
    if (!actionMessage) {
      return;
    }

    setReplyTo({
      ...actionMessage,
      sender_name:
        actionMessage?.sender_name ??
        actionMessage?.sender?.name ??
        conversationName,
      isOutgoing:
        Boolean(actionMessage?.localStatus) ||
        (currentUserId != null &&
          String(
            actionMessage?.sender_id ??
              actionMessage?.user_id ??
              actionMessage?.sender?.id ??
              "",
          ) === String(currentUserId)),
    });
    closeMessageActions();
  }, [actionMessage, closeMessageActions, conversationName, currentUserId]);

  const handleSwipeReply = useCallback(
    (message) => {
      if (!message) {
        return;
      }

      setReplyTo({
        ...message,
        sender_name:
          message?.sender_name ?? message?.sender?.name ?? conversationName,
        isOutgoing:
          Boolean(message?.localStatus) ||
          (currentUserId != null &&
            String(
              message?.sender_id ??
                message?.user_id ??
                message?.sender?.id ??
                "",
            ) === String(currentUserId)),
      });
    },
    [conversationName, currentUserId],
  );

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

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== actionMessage.id),
      );
    } catch (error) {
      console.error("Failed to delete message:", error);
      ThemedAlert.alert("Error", "Could not delete message.");
    } finally {
      closeMessageActions();
    }
  }, [actionMessage, closeMessageActions, currentUserId, groupId, isGroup]);

  const handleAttach = useCallback(async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== "granted") {
        ThemedAlert.alert(
          "Permission required",
          "Please allow access to your photos to send an image.",
        );
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
      console.error("Failed to pick image:", error);
      ThemedAlert.alert("Error", "Could not open image library.");
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedDraft = draft.trim();

    if (
      (!trimmedDraft && !selectedAttachmentUri) ||
      isSending ||
      !hasConversation
    ) {
      return;
    }

    const attachments = selectedAttachmentUri ? [selectedAttachmentUri] : [];

    const temporaryMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: temporaryMessageId,
      content: trimmedDraft,
      reply_to: replyTo?.id ?? null,
      sender_id: currentUserId ?? "local-user",
      created_at: new Date().toISOString(),
      localStatus: "sending",
      attachments: attachments.map((uri) => ({
        attachment_path: uri,
        isLocal: true,
      })),
    };

    setMessages((currentMessages) => [optimisticMessage, ...currentMessages]);
    setDraft("");
    setSelectedAttachmentUri(null);
    setReplyTo(null);
    setIsSending(true);
    updateTypingStatus(false);

    try {
      let sentMessage = null;

      if (isGroup) {
        sentMessage = await sendGroupMessage(
          groupId,
          currentUserId,
          trimmedDraft,
          attachments,
        );
      } else {
        sentMessage = await sendDirectMessage(
          currentUserId,
          contactId,
          trimmedDraft,
          attachments,
        );
      }

      const confirmedMessage =
        sentMessage && typeof sentMessage === "object"
          ? {
              ...optimisticMessage,
              ...sentMessage,
              content: trimmedDraft,
              localStatus: "sent",
            }
          : { ...optimisticMessage, localStatus: "sent" };

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === temporaryMessageId ? confirmedMessage : message,
        ),
      );
    } catch (error) {
      console.error("Send failed:", error);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === temporaryMessageId
            ? { ...message, localStatus: "failed" }
            : message,
        ),
      );
      ThemedAlert.alert("Failed", "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }, [
    contactId,
    currentUserId,
    draft,
    groupId,
    hasConversation,
    isGroup,
    isSending,
    replyTo,
    selectedAttachmentUri,
    updateTypingStatus,
  ]);

  const initiateCall = async (callType = "video") => {
    if (isGroup) {
      ThemedAlert.alert(
        "Coming Soon",
        "Group calls are currently in development.",
      );
      return;
    }

    if (!currentUserId || !contactId) return;

    if (!NativeModules?.WebRTCModule) {
      ThemedAlert.alert(
        "Call Unavailable",
        "WebRTC is not available in this build. Use a development client or a custom build with the WebRTC native module installed.",
      );
      return;
    }

    try {
      const { data: callData, error } = await supabase
        .from("calls")
        .insert({
          caller_id: currentUserId,
          receiver_id: contactId,
          status: "ringing",
          type: callType,
        })
        .select("id")
        .single();

      if (error) throw error;

      try {
        const { data: receiverProfile, error: receiverError } = await supabase
          .from("alumnis")
          .select("push_token, first_name, last_name")
          .eq("id", contactId)
          .single();

        if (!receiverError && receiverProfile?.push_token) {
          const callLabel = callType === "video" ? "video" : "voice";
          const callerLabel =
            `${currentUserProfile?.first_name ?? "Someone"} ${currentUserProfile?.last_name ?? ""}`.trim();

          await sendPushNotification(
            [receiverProfile.push_token],
            `${callerLabel || "Someone"} is calling you`,
            `Incoming ${callLabel} call.`,
            {
              screen: "IncomingCallScreen",
              type: "call",
              callId: callData.id,
              callerId: currentUserId,
              callType,
            },
          );
        }
      } catch (pushError) {
        console.warn("[Call] Failed to send incoming call push:", pushError);
      }

      const rootNav = navigation.getParent?.();
      if (rootNav?.navigate) {
        rootNav.navigate("CallScreen", {
          callId: callData.id,
          currentUserId: currentUserId,
          isCaller: true,
          type: callType,
        });
      } else {
        navigation.navigate("CallScreen", {
          callId: callData.id,
          currentUserId: currentUserId,
          isCaller: true,
          type: callType,
        });
      }
    } catch (error) {
      console.error(`[Call] Failed to start ${callType} call:`, error);
      ThemedAlert.alert(
        "Call Failed",
        "Unable to connect to the server right now.",
      );
    }
  };

  const renderMessageItem = useCallback(
    ({ item, index }) => {
      const senderId =
        item?.sender_id ??
        item?.user_id ??
        item?.sender?.id ??
        item?.sender?.user_id ??
        null;
      const isOutgoing =
        Boolean(item?.localStatus) ||
        (currentUserId != null &&
          senderId != null &&
          String(senderId) === String(currentUserId));
      const senderName =
        item?.sender?.first_name ??
        item?.sender?.name ??
        item?.sender_name ??
        conversationName;
      const senderAvatar = getAvatarUri(
        senderName,
        item?.sender?.alumni_photo ?? item?.sender_avatar ?? conversationAvatar,
      );
      const currentMessageDate = getMessageDate(item);
      const previousMessageDate = getMessageDate(
        messagesRef.current[index - 1],
      );
      const showMessageTime = !isSameMinute(
        currentMessageDate,
        previousMessageDate,
      );
      const messageTime = showMessageTime
        ? formatMessageTime(currentMessageDate)
        : null;
      const sendStatus = item?.localStatus ?? null;

      const decryptedItem = { ...item };

      return (
        <MessageBubble
          message={decryptedItem}
          isOutgoing={isOutgoing}
          showAvatar={!isOutgoing}
          senderAvatar={senderAvatar}
          onLongPress={() => openMessageActions(decryptedItem)}
          onSwipeReply={handleSwipeReply}
          onMentionPress={handleMentionPress}
          read={Boolean(item?.read_at)}
          messageTime={messageTime}
          sendStatus={sendStatus}
        />
      );
    },
    [
      allowMentions,
      conversationAvatar,
      conversationName,
      currentUserId,
      handleMentionPress,
      handleSwipeReply,
      openMessageActions,
    ],
  );

  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyConversationState}>
          <View style={styles.emptyConversationFlipped}>
            <Pressable style={styles.emptyConversationLoadingButton} disabled>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.emptyConversationLoadingText}>
                Loading messages...
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.emptyConversationState}>
        <View style={styles.emptyConversationFlipped}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={44}
            color="#8AA0E8"
          />
          <Text style={styles.emptyConversationTitle}>
            Start the conversation
          </Text>
          <Text style={styles.emptyConversationText}>
            Messages you send here will appear like an Instagram-style chat
            thread.
          </Text>
        </View>
      </View>
    );
  }, [isLoading]);

  if (!hasConversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.container}>
          <View style={styles.chatHeader}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => navigation.goBack()}
              hitSlop={8}
            >
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
            <Text style={styles.emptyConversationTitle}>
              No conversation selected
            </Text>
            <Text style={styles.emptyConversationText}>
              Open this screen from a contact or message thread.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <CustomKeyboardView
        footer={
          <View style={styles.composerFooterWrap}>
            {mentionContext && mentionSuggestions.length > 0 ? (
              <View style={styles.mentionPanel}>
                {mentionSuggestions.map((item, index) => (
                  <Pressable
                    key={`${String(item.id ?? item.name)}-${index}`}
                    style={styles.mentionItem}
                    onPress={() => handleMentionPick(item.handle)}
                  >
                    <Image
                      source={{ uri: item.avatar }}
                      style={styles.mentionAvatar}
                    />
                    <Text style={styles.mentionName} numberOfLines={1}>
                      @{item.handle}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {typingLabel ? (
              <View style={styles.typingIndicatorRow}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingText} numberOfLines={1}>
                    {typingLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            {selectedAttachmentUri ? (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 10,
                  flexDirection: "row",
                }}
              >
                <View style={{ position: "relative" }}>
                  <Image
                    source={{ uri: selectedAttachmentUri }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      backgroundColor: "#E5E7EB",
                    }}
                  />
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      backgroundColor: "#FFF",
                      borderRadius: 12,
                    }}
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
        }
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <ChatHeader
              title={conversationName}
              subtitle={headerSubtitle}
              avatarUri={getAvatarUri(conversationName, conversationAvatar)}
              onBackPress={() => navigation.goBack()}
              onProfilePress={() => {}}
              onCallPress={() => initiateCall("audio")}
              onVideoPress={() => initiateCall("video")}
              onInfoPress={() => {
                if (isGroup) {
                  navigation.navigate("ChatDetailsScreen", {
                    group: {
                      id: groupId,
                      name: conversationName,
                      avatar: getAvatarUri(
                        conversationName,
                        conversationAvatar,
                      ),
                      members: groupMembers,
                      media: [],
                    },
                  });
                  return;
                }

                navigation.navigate("ChatDetailsScreen", {
                  contact: {
                    id: contactId,
                    name:
                      params.contactName ??
                      params.userName ??
                      params.contact?.name ??
                      conversationName,
                    first_name:
                      params.contactFirstName ??
                      params.contact?.first_name ??
                      "",
                    last_name:
                      params.contactLastName ?? params.contact?.last_name ?? "",
                    username:
                      params.contactUsername ??
                      params.contact?.username ??
                      null,
                    avatar: params.contactAvatar ?? conversationAvatar,
                    alumni_photo:
                      params.contactPhoto ??
                      params.contact?.alumni_photo ??
                      null,
                  },
                });
              }}
            />

            <FlatList
              ref={flatListRef}
              inverted={true}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item, index) =>
                String(
                  item?.id ??
                    item?.tempId ??
                    item?.localId ??
                    item?.created_at ??
                    index,
                )
              }
              initialNumToRender={14}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              windowSize={8}
              removeClippedSubviews
              contentContainerStyle={
                messages.length > 0
                  ? styles.messagesContent
                  : [styles.messagesContent, { flexGrow: 1 }]
              }
              ListEmptyComponent={renderEmptyState}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.chatBody}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingMore ? (
                  <ActivityIndicator
                    size="small"
                    color="#31429B"
                    style={{ marginVertical: 12 }}
                  />
                ) : null
              }
            />

            <Modal
              visible={showActions}
              transparent
              animationType="fade"
              onRequestClose={closeMessageActions}
            >
              <View style={styles.reactionPickerOverlay}>
                <View style={styles.reactionPickerContent}>
                  <Text style={styles.reactionPickerTitle}>
                    Message actions
                  </Text>

                  <TouchableOpacity
                    style={styles.reactionPickerEmoji}
                    onPress={handleReply}
                  >
                    <Text style={styles.reactionPickerEmojiText}>Reply</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reactionPickerEmoji}
                    onPress={() => setShowReactionPicker(true)}
                  >
                    <Text style={styles.reactionPickerEmojiText}>React</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reactionPickerEmoji}
                    onPress={handleDeleteMessage}
                  >
                    <Text style={styles.reactionPickerEmojiText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reactionPickerClose}
                    onPress={closeMessageActions}
                  >
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
                  <Text style={styles.reactionPickerTitle}>
                    React to message
                  </Text>
                  <View style={styles.reactionPickerRow}>
                    {REACTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.reactionPickerEmoji}
                        onPress={() => handleReact(emoji)}
                      >
                        <Text style={styles.reactionPickerEmojiText}>
                          {emoji}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.reactionPickerClose}
                    onPress={() => setShowReactionPicker(false)}
                  >
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
    backgroundColor: "#E5E7EB",
  },
  messageAvatarSpacer: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  messageColumn: {
    flexShrink: 1,
    maxWidth: "76%",
  },
  bottomSafeArea: {
    backgroundColor: "transparent",
  },
  seenText: {
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
});