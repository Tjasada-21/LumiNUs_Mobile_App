import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AvatarInitials from "./AvatarInitials";
import supabase from "../services/supabase"; 

const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;

// Convert full URL back to relative storage path
const getRelativePath = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  
  if (/^https?:\/\//i.test(str)) {
    // Check if it's from the messages bucket
    const assetIndex = str.indexOf('luminus_messages_attachments/');
    if (assetIndex !== -1) {
      const relativePath = str.substring(assetIndex + 'luminus_messages_attachments/'.length);
      const cleanPath = relativePath.split('?')[0];
      if (cleanPath.length > 255) return null;
      return cleanPath;
    }

    // Check if it's from the old assets bucket
    const oldAssetIndex = str.indexOf('luminus_assets/');
    if (oldAssetIndex !== -1) {
      const relativePath = str.substring(oldAssetIndex + 'luminus_assets/'.length);
      const cleanPath = relativePath.split('?')[0];
      if (cleanPath.length > 255) return null;
      return cleanPath;
    }

    return null;
  }
  
  if (str.length > 255) return null;
  return str;
};

// Helper to get signed storage URL
const getSignedStorageUrl = async (path) => {
  if (!path) return null;
  
  // Always allow local device files immediately (for optimistic UI while sending)
  if (/^file:\/\//i.test(path)) return path;

  try {
    const relativePath = getRelativePath(path);
    
    // If it's a completely external URL (not from our buckets), return as is
    if (!relativePath && /^https?:\/\//i.test(path)) {
      return path;
    }
    
    const cleanPath = String(relativePath || path).replace(/^\/+/, "");
    if (cleanPath.length > 255) return null;
    
    const { data, error } = await supabase.storage
      .from('luminus_messages_attachments')
      .createSignedUrl(cleanPath, 60 * 60); // 1 hour expiry
    
    if (error) return null;
    return data?.signedUrl || null;
  } catch (err) {
    return null;
  }
};

const renderMessageContentWithMentions = (
  content,
  isOutgoing,
  onMentionPress,
  messageId,
) => {
  const text = String(content ?? "");
  const segments = text.split(MENTION_PATTERN);

  return segments.map((segment, index) => {
    const isMention = MENTION_PATTERN.test(segment);
    MENTION_PATTERN.lastIndex = 0;

    if (!isMention) {
      return (
        <Text
          key={`${messageId}-segment-${index}`}
          style={[
            styles.messageText,
            isOutgoing ? styles.textOutgoing : styles.textIncoming,
          ]}
        >
          {segment}
        </Text>
      );
    }

    return (
      <Text
        key={`${messageId}-mention-${index}-${segment}`}
        style={[
          styles.messageText,
          styles.mentionText,
          isOutgoing ? styles.mentionTextOutgoing : styles.mentionTextIncoming,
        ]}
        onPress={() => onMentionPress?.(segment)}
      >
        {segment}
      </Text>
    );
  });
};

const MessageBubble = ({
  message,
  isOutgoing,
  showAvatar,
  senderAvatar,
  senderName,
  onLongPress,
  onSwipeReply,
  read,
  messageTime,
  sendStatus,
  onMentionPress,
}) => {
  const hasReactions = Boolean(
    message?.reactions && Object.keys(message.reactions).length > 0,
  );
  const showSendingStatus = isOutgoing && sendStatus === "sending";
  const showFailedStatus = isOutgoing && sendStatus === "failed";
  
  const translateX = useRef(new Animated.Value(0)).current;
  const entranceProgress = useRef(new Animated.Value(0)).current;
  const swipeDirection = isOutgoing ? -1 : 1;

  // State to hold authorized URLs and Image Viewer
  const [signedAttachments, setSignedAttachments] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);

  // Generate signed URLs when attachments change
  useEffect(() => {
    let active = true;
    
    const resolveAttachments = async () => {
      const atts = Array.isArray(message?.attachments) ? message.attachments : 
                   message?.attachment ? [{ attachment_path: message.attachment }] : [];
                   
      if (atts.length === 0) {
        if (active) setSignedAttachments([]);
        return;
      }

      const authorizedUris = await Promise.all(
        atts.map(async (att) => {
          const rawUri = att?.attachment_path || att?.attachment || null;
          if (!rawUri) return null;
          // If the attachment has an isLocal flag (from CreatePost/Send), it's a local cache URI
          if (att.isLocal) return rawUri;
          const signedUrl = await getSignedStorageUrl(rawUri);
          return signedUrl || rawUri;
        })
      );
      
      if (active) setSignedAttachments(authorizedUris.filter(Boolean));
    };

    resolveAttachments();
    return () => { active = false; };
  }, [message?.attachments, message?.attachment]);

  useEffect(() => {
    entranceProgress.setValue(0);
    Animated.spring(entranceProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [entranceProgress, message?.id]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalDistance = Math.abs(gestureState.dx);
          return (
            horizontalDistance > 6 &&
            horizontalDistance > Math.abs(gestureState.dy)
          );
        },
        onPanResponderGrant: () => {
          translateX.setOffset(0);
          translateX.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          const limitedDx = Math.max(Math.min(gestureState.dx, 90), -90);
          translateX.setValue(limitedDx * 0.35);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldReply = swipeDirection * gestureState.dx > 55;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();

          if (shouldReply) {
            onSwipeReply?.(message);
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [message, onSwipeReply, swipeDirection, translateX],
  );

  return (
    <View
      style={[
        styles.messageRow,
        isOutgoing ? styles.rowOutgoing : styles.rowIncoming,
      ]}
    >
      {!isOutgoing ? (
        showAvatar ? (
          <AvatarInitials name={senderName} uri={senderAvatar} size={24} style={styles.avatar} />
        ) : (
          <View style={styles.avatarSpacer} />
        )
      ) : null}

      <Animated.View
        {...swipeResponder.panHandlers}
        style={[
          styles.bubbleWrapper,
          isOutgoing
            ? styles.bubbleWrapperOutgoing
            : styles.bubbleWrapperIncoming,
          {
            opacity: entranceProgress,
            transform: [
              { translateX },
              {
                translateY: entranceProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: entranceProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onLongPress}
          style={[
            styles.bubble,
            isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
            hasReactions && styles.bubbleWithReaction,
          ]}
        >
          {signedAttachments.length > 0 ? (
            <View style={styles.attachmentsRow}>
              {signedAttachments.map((uri, idx) => (
                <TouchableOpacity
                  key={`att-${String(message.id ?? "")}-${idx}`}
                  onPress={() => setViewerImage(uri)}
                  activeOpacity={0.8}
                  style={styles.attachmentWrap}
                >
                  <Image source={{ uri }} style={styles.attachmentImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {message?.content ? (
            <Text>
              {renderMessageContentWithMentions(
                message.content,
                isOutgoing,
                onMentionPress,
                message.id,
              )}
            </Text>
          ) : null}
        </TouchableOpacity>

        {hasReactions ? (
          <View
            style={[
              styles.reactionBadge,
              isOutgoing
                ? styles.reactionBadgeOutgoing
                : styles.reactionBadgeIncoming,
            ]}
          >
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <Text key={emoji} style={styles.reactionText}>
                {emoji} {count > 1 ? count : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {/* TIME & STATUS UNDERNEATH THE BUBBLE */}
        {(messageTime || showSendingStatus || showFailedStatus) && (
          <View
            style={[
              styles.messageMetaRow,
              isOutgoing
                ? styles.messageMetaRowOutgoing
                : styles.messageMetaRowIncoming,
            ]}
          >
            {showSendingStatus ? (
              <Text style={styles.messageTime}>Sending...</Text>
            ) : showFailedStatus ? (
              <Text style={styles.statusTextFailed}>Not sent</Text>
            ) : (
              <Text style={styles.messageTime}>
                {isOutgoing ? `sent ${messageTime}` : messageTime}
              </Text>
            )}
          </View>
        )}
      </Animated.View>

      {/* FULL SCREEN IMAGE VIEWER MODAL */}
      <Modal
        visible={!!viewerImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <View style={styles.viewerBackdrop}>
          <SafeAreaView style={styles.viewerSafeArea}>
            <View style={styles.viewerHeader}>
              <TouchableOpacity onPress={() => setViewerImage(null)} style={styles.viewerCloseBtn}>
                <Ionicons name="close" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.viewerContent}>
              {viewerImage && (
                <Image 
                  source={{ uri: viewerImage }} 
                  style={styles.viewerImageFull} 
                  resizeMode="contain" 
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const areReactionsEqual = (firstReactions, secondReactions) => {
  if (firstReactions === secondReactions) return true;
  if (!firstReactions || !secondReactions) return false;
  const firstKeys = Object.keys(firstReactions);
  const secondKeys = Object.keys(secondReactions);
  if (firstKeys.length !== secondKeys.length) return false;
  return firstKeys.every((key) => firstReactions[key] === secondReactions[key]);
};

const areMessageBubblePropsEqual = (prevProps, nextProps) => {
  const prevMsg = prevProps.message ?? {};
  const nextMsg = nextProps.message ?? {};

  const prevAttLength = Array.isArray(prevMsg.attachments) ? prevMsg.attachments.length : 0;
  const nextAttLength = Array.isArray(nextMsg.attachments) ? nextMsg.attachments.length : 0;

  return (
    prevProps.isOutgoing === nextProps.isOutgoing &&
    prevProps.sendStatus === nextProps.sendStatus &&
    prevMsg.id === nextMsg.id &&
    prevMsg.content === nextMsg.content &&
    prevAttLength === nextAttLength &&
    prevMsg.localStatus === nextMsg.localStatus &&
    areReactionsEqual(prevMsg.reactions, nextMsg.reactions)
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingHorizontal: 0,
  },
  rowOutgoing: {
    justifyContent: "flex-end",
  },
  rowIncoming: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 20, 
  },
  avatarSpacer: {
    width: 48, 
  },
  bubbleWrapper: {
    position: "relative",
    maxWidth: "75%", 
    flexShrink: 1,
  },
  bubbleWrapperOutgoing: {
    alignItems: "flex-end",
  },
  bubbleWrapperIncoming: {
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexShrink: 1,
    maxWidth: "100%",
  },
  bubbleOutgoing: {
    backgroundColor: "#31429B",
    alignSelf: "flex-end",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4, 
  },
  bubbleIncoming: {
    backgroundColor: "#E2E8F0", 
    alignSelf: "flex-start",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
  },
  bubbleWithReaction: {
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  textOutgoing: {
    color: "#FFFFFF",
  },
  textIncoming: {
    color: "#1C1C1E",
  },
  mentionText: {
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },
  mentionTextOutgoing: {
    color: "#F2C919",
  },
  mentionTextIncoming: {
    color: "#31429B",
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  attachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  attachmentWrap: {
    marginRight: 8,
  },
  reactionBadge: {
    position: "absolute",
    bottom: 12, 
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  reactionBadgeOutgoing: {
    right: 12,
  },
  reactionBadgeIncoming: {
    left: 12,
  },
  reactionText: {
    fontSize: 12,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  messageMetaRowOutgoing: {
    justifyContent: "flex-end",
    marginRight: 2, 
  },
  messageMetaRowIncoming: {
    justifyContent: "flex-start",
    marginLeft: 2,
  },
  messageTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },
  statusTextFailed: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
    fontFamily: "Poppins_600SemiBold",
  },
  // VIEWER STYLES
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  viewerSafeArea: {
    flex: 1,
  },
  viewerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  viewerCloseBtn: {
    padding: 8,
  },
  viewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  viewerImageFull: {
    width: '100%',
    height: '100%',
  },
});

export default React.memo(MessageBubble, areMessageBubblePropsEqual);