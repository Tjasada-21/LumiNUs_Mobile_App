import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartTextInput from './SmartTextInput';

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
}) => {
  const [inputHeight, setInputHeight] = useState(38);

  const hasText = useMemo(() => value.trim().length > 0, [value]);

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
          <TouchableOpacity style={styles.smileButton} onPress={onEmoji} activeOpacity={0.8}>
            <Ionicons name="happy-outline" size={18} color="#31429B" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSend}
            disabled={disabled || !hasText}
            style={[styles.sendButton, (!hasText || disabled) && styles.sendButtonDisabled]}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0F7',
    borderRadius: 32,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 12,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D7DDF0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#24346F',
    paddingTop: 0,
    paddingBottom: 0,
    marginRight: 10,
    maxHeight: 104,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
