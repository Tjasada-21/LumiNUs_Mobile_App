import React, { useState, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { createGroupChat } from "../services/messageQueries";
import { getAvatarUri } from "../utils/imageUtils"; 
import styles from "../styles/NewMessageScreen.styles";
import { useRoute } from "@react-navigation/native";

/**
 * Robust inline avatar component.
 * Attempts to load the user's actual profile photo. If it fails, or if 
 * they don't have one, it cleanly falls back to their initials.
 */
const UserAvatar = ({ name, photo, size = 50, style }) => {
  const [hasError, setHasError] = useState(false);
  const avatarUrl = getAvatarUri(name, photo);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  if (!avatarUrl || hasError) {
    return (
      <View 
        style={[
          styles.avatarFallback,
          style, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2, 
          }
        ]}
      >
        <Text style={[styles.avatarFallbackText, { fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image 
      source={{ uri: avatarUrl }} 
      style={[
        styles.avatarImage,
        style, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
        }
      ]} 
      onError={() => setHasError(true)}
    />
  );
};

export default function NewMessageScreen({ navigation }) {
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    const prefillMembers = route?.params?.prefillMembers;
    const prefillName = route?.params?.prefillName;
    
    if (prefillMembers && prefillMembers.length > 0) {
      setSelectedMemberIds(prefillMembers);
      setGroupName(prefillName || "");
      setIsGroupModalVisible(true);
    }
  }, [route?.params]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      const currentUser = await getCurrentUser().catch(() => null);
      const currentUserId = currentUser?.id;
      setCurrentUserId(currentUserId ?? null);

      const { data, error } = await supabase
        .from("alumnis")
        .select("id, first_name, last_name, alumni_photo")
        .order("first_name", { ascending: true });

      if (error) throw error;

      const filteredUsers = (data || []).filter(user => user.id !== currentUserId);
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching alumni users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedUsers = users.filter(user => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const selectedUsers = users.filter((user) => selectedMemberIds.includes(user.id));

  const openGroupModal = () => {
    setGroupName("");
    setSelectedMemberIds([]);
    setIsGroupModalVisible(true);
  };

  const toggleSelectedMember = (userId) => {
    setSelectedMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleCreateGroupChat = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "Your account could not be identified.");
      return;
    }

    if (selectedMemberIds.length < 1) {
      Alert.alert("Select members", "Choose at least one connection to create a group chat.");
      return;
    }

    try {
      setIsCreatingGroup(true);
      const finalGroupName = groupName.trim() || "Group Chat";
      const createdGroup = await createGroupChat(currentUserId, finalGroupName, selectedMemberIds);

      setIsGroupModalVisible(false);
      navigation.navigate("ConvoScreen", {
        groupId: createdGroup.id,
        groupName: finalGroupName,
        groupMembers: selectedUsers,
      });
    } catch (error) {
      Alert.alert("Unable to create group", error?.message || "Please try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const openChat = (selectedUser) => {
    const fullName = `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim();
    const avatarUrl = getAvatarUri(fullName, selectedUser.alumni_photo);
    
    navigation.navigate("ConvoScreen", {
      contactId: selectedUser.id,
      contactName: fullName,
      contactAvatar: avatarUrl
    });
  };

  const renderItem = ({ item }) => {
    const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();

    return (
      <TouchableOpacity
        style={styles.listItem}
        activeOpacity={0.7}
        onPress={() => openChat(item)}
      >
        <UserAvatar name={fullName} photo={item.alumni_photo} size={50} style={styles.avatar} />
        <Text style={styles.nameText}>{fullName}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-undo-outline" size={26} color="#333333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New message</Text>
        </View>

        <View style={styles.searchRow}>
          <Text style={styles.toLabel}>To:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type a name or group"
            placeholderTextColor="#888888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.createGroupButton} activeOpacity={0.85} onPress={openGroupModal}>
          <Ionicons name="people-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createGroupButtonText}>Create Group Chat</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : (
          <FlatList
            data={displayedUsers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>Suggested</Text>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users found.</Text>
            }
          />
        )}

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/luminus_text_logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isGroupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGroupModalVisible(false)}
      >
        <Pressable style={styles.groupModalBackdrop} onPress={() => setIsGroupModalVisible(false)} />
        <View style={styles.groupModalContainer}>
          <View style={styles.groupModalCard}>
            <View style={styles.groupModalHeader}>
              <Text style={styles.groupModalTitle}>Create Group Chat</Text>
              <Pressable onPress={() => setIsGroupModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#1C1C1E" />
              </Pressable>
            </View>

            <Text style={styles.groupModalLabel}>Group Name</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Optional group name"
              placeholderTextColor="#9CA3AF"
              style={styles.groupNameInput}
            />

            <Text style={styles.groupModalLabel}>Select members</Text>
            <Text style={styles.groupModalHint}>Tap connections to include them in the group.</Text>

            <FlatList
              data={displayedUsers}
              keyExtractor={(item) => String(item.id)}
              style={styles.groupMemberList}
              contentContainerStyle={styles.groupMemberListContent}
              renderItem={({ item }) => {
                const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
                const isSelected = selectedMemberIds.includes(item.id);

                return (
                  <Pressable
                    style={[styles.groupMemberRow, isSelected && styles.groupMemberRowSelected]}
                    onPress={() => toggleSelectedMember(item.id)}
                  >
                    <UserAvatar name={fullName} photo={item.alumni_photo} size={38} style={styles.groupMemberAvatar} />
                    <Text style={styles.groupMemberName} numberOfLines={1}>{fullName}</Text>
                    <View style={[styles.groupMemberCheck, isSelected && styles.groupMemberCheckSelected]}>
                      {isSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />

            <TouchableOpacity
              style={[styles.groupCreateButton, isCreatingGroup && styles.groupCreateButtonDisabled]}
              onPress={handleCreateGroupChat}
              disabled={isCreatingGroup}
              activeOpacity={0.85}
            >
              {isCreatingGroup ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.groupCreateButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}