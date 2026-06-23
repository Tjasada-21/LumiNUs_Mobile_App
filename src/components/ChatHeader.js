import React from "react";
import { Image, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ChatHeader = ({
  title,
  subtitle,
  avatarUri,
  onBackPress,
  onProfilePress,
  onInfoPress,
  navigation,
  chatData,
}) => {
  const handleInfoPress = () => {
    if (navigation && chatData) {
      navigation.navigate("ChatDetailsScreen", chatData);
    } else if (onInfoPress) {
      onInfoPress();
    }
  };

  return (
    <View style={styles.chatHeaderWrap}>
      <View style={styles.chatHeader}>
        <Pressable
          style={styles.headerIconButton}
          onPress={onBackPress}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={26} color="#31429B" />
        </Pressable>

        <Pressable style={styles.headerProfileWrap} onPress={onProfilePress}>
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.infoButtonSolid}
            onPress={handleInfoPress}
            hitSlop={8}
          >
            <Ionicons
              name="information"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHeaderWrap: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    alignSelf: "stretch",
    // Slight shadow for a floating feel
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 10,
  },
  chatHeader: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 16 : 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  headerProfileWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoButtonSolid: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

export default ChatHeader;