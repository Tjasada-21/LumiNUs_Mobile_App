import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, PanResponder, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;

const renderMessageContentWithMentions = (content, isOutgoing, onMentionPress, messageId) => {
  const text = String(content ?? '');
  const segments = text.split(MENTION_PATTERN);

  return segments.map((segment, index) => {
    const isMention = MENTION_PATTERN.test(segment);
    MENTION_PATTERN.lastIndex = 0;

    if (!isMention) {
      return (
        <Text key={`${messageId}-segment-${index}`} style={[styles.messageText, isOutgoing ? styles.textOutgoing : styles.textIncoming]}>
          {segment}
        </Text>
      );
    }

    return (
      <Text
        key={`${messageId}-mention-${index}-${segment}`}
        style={[
          styles.messageText,
          isOutgoing ? styles.textOutgoing : styles.textIncoming,
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

const MessageBubble = ({ message, isOutgoing, showAvatar, senderAvatar, onLongPress, onSwipeReply, read, messageTime, sendStatus, onMentionPress }) => {
  const hasReactions = Boolean(message?.reactions && Object.keys(message.reactions).length > 0);
  const showSendingStatus = isOutgoing && sendStatus === 'sending';
  const showFailedStatus = isOutgoing && sendStatus === 'failed';
  const showSentStatus = isOutgoing && sendStatus === 'sent';
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

  const swipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const horizontalDistance = Math.abs(gestureState.dx);
      return horizontalDistance > 6 && horizontalDistance > Math.abs(gestureState.dy);
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
  }), [message, onSwipeReply, swipeDirection, translateX]);

  return (
    <View style={[styles.messageRow, isOutgoing ? styles.rowOutgoing : styles.rowIncoming]}>
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
          isOutgoing ? styles.bubbleWrapperOutgoing : styles.bubbleWrapperIncoming,
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
          {Array.isArray(message?.attachments) && message.attachments.length > 0 ? (
            <View style={styles.attachmentsRow}>
              {message.attachments.map((att, idx) => {
                const uri = att?.attachment_path || att?.attachment || null;
                if (!uri) return null;
                return (
                  <TouchableOpacity
                    key={`att-${String(message.id ?? '')}-${idx}`}
                    onPress={() => {
                      try {
                        if (uri) Linking.openURL(uri);
                      } catch (e) {
                        // ignore
                      }
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
            <Image source={{ uri: message.attachment }} style={styles.attachmentImage} />
          ) : null}

          {message?.content ? (
            <Text>
              {renderMessageContentWithMentions(message.content, isOutgoing, onMentionPress, message.id)}
            </Text>
          ) : null}
        </TouchableOpacity>

        {hasReactions ? (
          <View style={[styles.reactionBadge, isOutgoing ? styles.reactionBadgeOutgoing : styles.reactionBadgeIncoming]}>
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <Text key={emoji} style={styles.reactionText}>
                {emoji} {count > 1 ? count : ''}
              </Text>
            ))}
          </View>
        ) : null}

        {(messageTime || showSendingStatus || showSentStatus || showFailedStatus || (isOutgoing && read)) ? (
          <View style={[styles.messageMetaRow, isOutgoing ? styles.messageMetaRowOutgoing : styles.messageMetaRowIncoming]}>
            {messageTime ? <Text style={styles.messageTime}>{messageTime}</Text> : null}
            {showSendingStatus ? (
              <View style={styles.statusWrap}>
                <Ionicons name="time-outline" size={11} color="#6B7280" />
                <Text style={styles.statusText}>Sending...</Text>
              </View>
            ) : null}
            {showSentStatus ? (
              <View style={styles.statusWrap}>
                <Ionicons name="checkmark-circle-outline" size={11} color="#6B7280" />
                <Text style={styles.statusText}>Sent</Text>
              </View>
            ) : null}
            {showFailedStatus ? (
              <View style={styles.statusWrap}>
                <Ionicons name="close-circle-outline" size={11} color="#D92D20" />
                <Text style={styles.statusTextFailed}>Not sent</Text>
              </View>
            ) : null}
            {!showSendingStatus && !showFailedStatus && !showSentStatus && isOutgoing && read ? <Text style={styles.readReceipt}>Seen</Text> : null}
          </View>
        ) : null}
      </Animated.View>

    </View>
  );
};

const areReactionsEqual = (firstReactions, secondReactions) => {
  if (firstReactions === secondReactions) {
    return true;
  }

  if (!firstReactions || !secondReactions) {
    return false;
  }

  const firstKeys = Object.keys(firstReactions);
  const secondKeys = Object.keys(secondReactions);

  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  return firstKeys.every((key) => firstReactions[key] === secondReactions[key]);
};

const areMessageBubblePropsEqual = (previousProps, nextProps) => {
  const previousMessage = previousProps.message ?? {};
  const nextMessage = nextProps.message ?? {};

  const prevAttachments = previousMessage.attachments ? JSON.stringify(previousMessage.attachments) : '';
  const nextAttachments = nextMessage.attachments ? JSON.stringify(nextMessage.attachments) : '';

  return previousProps.isOutgoing === nextProps.isOutgoing
    && previousProps.showAvatar === nextProps.showAvatar
    && previousProps.senderAvatar === nextProps.senderAvatar
    && previousProps.read === nextProps.read
    && previousProps.messageTime === nextProps.messageTime
    && previousProps.sendStatus === nextProps.sendStatus
    && previousMessage.id === nextMessage.id
    && previousMessage.content === nextMessage.content
    && prevAttachments === nextAttachments
    && previousMessage.reply_to === nextMessage.reply_to
    && previousMessage.localStatus === nextMessage.localStatus
    && previousMessage.read_at === nextMessage.read_at
    && areReactionsEqual(previousMessage.reactions, nextMessage.reactions);
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 0,
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  avatarSpacer: {
    width: 36,
  },
  bubbleWrapper: {
    position: 'relative',
    maxWidth: '75%',
    flexShrink: 1,
  },
  bubbleWrapperOutgoing: {
    alignItems: 'flex-end',
  },
  bubbleWrapperIncoming: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    flexShrink: 1,
    maxWidth: '100%',
  },
  bubbleOutgoing: {
    backgroundColor: '#3797F0',
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  bubbleIncoming: {
    backgroundColor: '#EFEFEF',
    alignSelf: 'flex-start',
  },
  bubbleWithReaction: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  textOutgoing: {
    color: '#FFFFFF',
  },
  textIncoming: {
    color: '#1F2937',
  },
  mentionText: {
    fontWeight: '900',
    textDecorationLine: 'underline',
    color: '#F2C919',
  },
  mentionTextOutgoing: {
    color: '#F2C919',
  },
  mentionTextIncoming: {
    color: '#F2C919',
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  attachmentWrap: {
    marginRight: 8,
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  messageMetaRowOutgoing: {
    justifyContent: 'flex-end',
  },
  messageMetaRowIncoming: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusTextFailed: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#D92D20',
  },
  readReceipt: {
    fontSize: 11,
    color: '#8E8E8E',
  },
});

export default React.memo(MessageBubble, areMessageBubblePropsEqual);

