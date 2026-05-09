import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatHeader = ({
  title,
  subtitle,
  avatarUri,
  onBackPress,
  onProfilePress,
  onCallPress,
  onVideoPress,
  onInfoPress,
  navigation,
  chatData,
}) => {
  const handleInfoPress = () => {
    if (navigation && chatData) {
      navigation.navigate('ChatDetailsScreen', chatData);
    } else if (onInfoPress) {
      onInfoPress();
    }
  };
  return (
    <View style={styles.chatHeaderWrap}>
      <View style={styles.chatHeader}>
        <Pressable style={styles.headerIconButton} onPress={onBackPress} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#31429B" />
        </Pressable>

        <Pressable style={styles.headerProfileWrap} onPress={onProfilePress}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.headerAvatar}
          />
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
          {/* <Pressable style={styles.headerIconButton} onPress={onCallPress} hitSlop={8}>
            <Ionicons name="call-outline" size={22} color="#31429B" />
          </Pressable>
          <Pressable style={styles.headerIconButton} onPress={onVideoPress} hitSlop={8}>
            <Ionicons name="videocam-outline" size={22} color="#31429B" />
          </Pressable> */}
          <Pressable style={styles.headerIconButton} onPress={handleInfoPress} hitSlop={8}>
            <Ionicons name="information-circle-outline" size={24} color="#31429B" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHeaderWrap: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    alignSelf: 'stretch',
  },
  chatHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  headerProfileWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

export default ChatHeader;