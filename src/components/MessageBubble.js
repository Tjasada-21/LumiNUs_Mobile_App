import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Linking,
} from "react-native";

const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;

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
          <Image source={{ uri: senderAvatar }} style={styles.avatar} />
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
          {Array.isArray(message?.attachments) &&
          message.attachments.length > 0 ? (
            <View style={styles.attachmentsRow}>
              {message.attachments.map((att, idx) => {
                const uri = att?.attachment_path || att?.attachment || null;
                if (!uri) return null;
                return (
                  <TouchableOpacity
                    key={`att-${String(message.id ?? "")}-${idx}`}
                    onPress={() => {
                      try {
                        if (uri) Linking.openURL(uri);
                      } catch (e) {}
                    }}
                    activeOpacity={0.8}
                    style={styles.attachmentWrap}
                  >
                    <Image source={{ uri }} style={styles.attachmentImage} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : message?.attachment ? (
            <Image
              source={{ uri: message.attachment }}
              style={styles.attachmentImage}
            />
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
    marginBottom: 20, // Push avatar up slightly so it aligns with the bubble, not the meta text
  },
  avatarSpacer: {
    width: 48, // 32 avatar + 16 margins
  },
  bubbleWrapper: {
    position: "relative",
    maxWidth: "75%", // Slimmer max-width per modern design
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
  // Teardrop shape for Outgoing
  bubbleOutgoing: {
    backgroundColor: "#31429B",
    alignSelf: "flex-end",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4, 
  },
  // Teardrop shape for Incoming
  bubbleIncoming: {
    backgroundColor: "#E2E8F0", // Soft gray
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
    bottom: 12, // adjusted due to meta text below
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
    marginRight: 2, // Slight indent from the flat edge
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
});

export default React.memo(MessageBubble, areMessageBubblePropsEqual);