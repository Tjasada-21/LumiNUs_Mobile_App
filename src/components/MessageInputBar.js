import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  LayoutAnimation,
  LogBox,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SmartTextInput from "./SmartTextInput";

LogBox.ignoreLogs([
  "setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture.",
]);

const MessageInputBar = ({
  value = "",
  onChangeText,
  onSend,
  onAttach,
  disabled,
  isReplying,
  onCancelReply,
  replyTo,
  hasAttachment = false,
}) => {
  const [inputHeight, setInputHeight] = useState(40);
  
  const hasText = useMemo(() => value.trim().length > 0, [value]);
  const canSend = hasText || hasAttachment;

  useEffect(() => {
    if (!value.trim()) {
      setInputHeight(40);
    }
  }, [value]);

  const handleContentSizeChange = (event) => {
    const nextHeight = event?.nativeEvent?.contentSize?.height ?? 40;
    setInputHeight(Math.min(Math.max(40, nextHeight), 104));
  };

  const composerInputHeight = hasText ? inputHeight : 40;
  const composerTextAlignVertical = Platform.OS === "android" ? (hasText ? "top" : "center") : "center";

  return (
    <View style={styles.wrapper}>
      {isReplying && replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>Replying to {replyTo?.sender_name || "message"}</Text>
            <View style={[styles.replyBubble, replyTo?.isOutgoing ? styles.replyBubbleOutgoing : styles.replyBubbleIncoming]}>
              <Text style={[styles.replyBubbleText, replyTo?.isOutgoing ? styles.replyBubbleTextOutgoing : styles.replyBubbleTextIncoming]} numberOfLines={2}>
                {replyTo.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close-circle" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        {/* Outline Paperclip Button */}
        <TouchableOpacity style={styles.attachButton} onPress={onAttach} activeOpacity={0.6}>
          <Ionicons name="attach-outline" size={24} color="#1C1C1E" />
        </TouchableOpacity>

        {/* Gray Pill Input */}
        <View style={styles.pill}>
          <SmartTextInput
            style={[styles.textInput, { height: composerInputHeight }]}
            placeholder="Aa"
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
            onContentSizeChange={handleContentSizeChange}
            onBlur={() => setInputHeight(40)}
            multiline={true}
            maxLength={500}
            textAlignVertical={composerTextAlignVertical}
            scrollEnabled={hasText && inputHeight >= 104}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>

        {/* Solid Blue Send Button */}
        <TouchableOpacity
          onPress={onSend}
          disabled={disabled || !canSend}
          style={[styles.sendButton, (!canSend || disabled) && styles.sendButtonDisabled]}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 16,
    alignSelf: "stretch",
  },
  replyBar: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
  },
  replyContent: {
    flex: 1,
    marginRight: 12,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 4,
  },
  replyBubble: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyBubbleIncoming: {
    backgroundColor: "#E2E8F0",
  },
  replyBubbleOutgoing: {
    backgroundColor: "#31429B",
  },
  replyBubbleText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
  replyBubbleTextIncoming: {
    color: "#1C1C1E",
  },
  replyBubbleTextOutgoing: {
    color: "#FFFFFF",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    gap: 12, // Native gap between all 3 elements
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1C1C1E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4, // Align to bottom of pill
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    paddingTop: Platform.OS === "ios" ? 8 : 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 4,
    maxHeight: 104,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#31429B",
    marginBottom: 2, 
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

export default MessageInputBar;