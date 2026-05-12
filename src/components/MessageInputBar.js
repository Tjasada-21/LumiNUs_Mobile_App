import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View, TouchableOpacity, StyleSheet, Text, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartTextInput from './SmartTextInput';

// Enable LayoutAnimation on Android (suppress warning for New Architecture)
if (Platform.OS === 'android') {
  try {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  } catch (e) {
    // Silently fail on New Architecture where this is not supported
  }
}

const MessageInputBar = ({
  value = '',
  onChangeText,
  onSend,
  onAttach,
  onEmoji,
  disabled,
  isReplying,
  onCancelReply,
  replyTo,
  hasAttachment = false,
}) => {
  const [inputHeight, setInputHeight] = useState(38);
  const [isTyping, setIsTyping] = useState(false);

  const hasText = useMemo(() => value.trim().length > 0, [value]);
  const canSend = hasText || hasAttachment;

  // Trigger smooth layout animations whenever the user starts or stops typing
  useEffect(() => {
    const nextIsTyping = value.trim().length > 0 || hasAttachment;
    if (nextIsTyping !== isTyping) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsTyping(nextIsTyping);
    }
  }, [value, hasAttachment, isTyping]);

  useEffect(() => {
    if (!value.trim()) {
      setInputHeight(38);
    }
  }, [value]);

  const handleContentSizeChange = (event) => {
    const nextHeight = event?.nativeEvent?.contentSize?.height ?? 38;
    setInputHeight(Math.min(Math.max(38, nextHeight), 104));
  };

  const composerInputHeight = hasText ? inputHeight : 38;
  const composerTextAlignVertical = Platform.OS === 'android' ? (hasText ? 'top' : 'center') : 'center';

  return (
    <View style={[styles.wrapper, { width: '100%', paddingBottom: 0, marginBottom: 0 }]}> 
      {isReplying && replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>You replied</Text>
            <View
              style={[
                styles.replyBubble,
                replyTo?.isOutgoing ? styles.replyBubbleOutgoing : styles.replyBubbleIncoming,
              ]}
            >
              <Text
                style={[
                  styles.replyBubbleText,
                  replyTo?.isOutgoing ? styles.replyBubbleTextOutgoing : styles.replyBubbleTextIncoming,
                ]}
                numberOfLines={2}
              >
                {replyTo.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close" size={20} color="#8E8E8E" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        {/* Instagram style outer camera button - Disappears when typing */}
        {!isTyping && (
          <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8}>
            <View style={styles.cameraCircle}>
              <Ionicons name="camera" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.pill}>
          <SmartTextInput
            style={[styles.textInput, { height: composerInputHeight }]}
            placeholder="Message..."
            placeholderTextColor="#8E8E8E"
            value={value}
            onChangeText={onChangeText}
            onContentSizeChange={handleContentSizeChange}
            onBlur={() => setInputHeight(38)}
            multiline={hasText}
            numberOfLines={1}
            maxLength={500}
            textAlignVertical={composerTextAlignVertical}
            scrollEnabled={hasText && inputHeight >= 104}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          
          <View style={styles.actionsWrap}>
            {!isTyping ? (
              // Idle State: Show the Instagram-style utility icons inside the pill
              <View style={styles.idleIconsRow}>
                <TouchableOpacity style={styles.actionIcon} activeOpacity={0.6}>
                  <Ionicons name="mic-outline" size={24} color="#31429B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIcon} onPress={onAttach} activeOpacity={0.6}>
                  <Ionicons name="image-outline" size={24} color="#31429B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIcon} onPress={onEmoji} activeOpacity={0.6}>
                  <Ionicons name="happy-outline" size={24} color="#31429B" />
                </TouchableOpacity>
              </View>
            ) : (
              // Typing State: Show only the Send Button
              <TouchableOpacity
                onPress={onSend}
                disabled={disabled || !canSend}
                style={[styles.sendButton, (!canSend || disabled) && styles.sendButtonDisabled]}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingTop: 0,
    alignSelf: 'stretch',
  },
  replyBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 10,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyContent: {
    flex: 1,
    marginRight: 10,
    alignItems: 'flex-end',
  },
  replyLabel: {
    alignSelf: 'flex-end',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  replyBubble: {
    width: '72%',
    minWidth: 170,
    alignSelf: 'flex-end',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  replyBubbleIncoming: {
    backgroundColor: 'rgba(255, 255, 255, 0.64)',
  },
  replyBubbleOutgoing: {
    backgroundColor: 'rgba(183, 28, 28, 0.72)',
  },
  replyBubbleText: {
    fontSize: 16,
    lineHeight: 20,
  },
  replyBubbleTextIncoming: {
    color: '#111111',
  },
  replyBubbleTextOutgoing: {
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  cameraButton: {
    marginRight: 10,
    marginBottom: 4, // Align with the bottom of the pill
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#31429B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end', // Keeps icons at the bottom when text area expands
    backgroundColor: '#EEF0F7',
    borderRadius: 24, // Slightly rounder for the IG look
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D7DDF0',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#24346F',
    paddingTop: 6,
    paddingBottom: 6,
    marginRight: 8,
    maxHeight: 104,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2, // Aligns icons with the single-line text input
  },
  idleIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  actionIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#31429B',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#9AA4CF',
  },
});

export default MessageInputBar;