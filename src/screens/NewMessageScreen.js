import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAvatarUri } from "../utils/imageUtils";
import styles from "../styles/NewMessageScreen.styles";

export default function NewMessageScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Get the currently logged-in user so we don't show them in their own list
      const currentUser = await getCurrentUser().catch(() => null);
      const currentUserId = currentUser?.id;

      // Fetch all alumni from Supabase
      const { data, error } = await supabase
        .from("alumnis")
        .select("id, first_name, last_name, alumni_photo")
        .order("first_name", { ascending: true });

      if (error) throw error;

      // Filter out the active user and set the state
      const filteredUsers = (data || []).filter(user => user.id !== currentUserId);
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching alumni users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time local search filtering
  const displayedUsers = users.filter(user => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const openChat = (selectedUser) => {
    const fullName = `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim();
    navigation.navigate("ConvoScreen", {
      contactId: selectedUser.id,
      contactName: fullName,
      contactAvatar: selectedUser.alumni_photo
    });
  };

  const renderItem = ({ item }) => {
    const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
    const avatarUrl = getAvatarUri(fullName, item.alumni_photo);

    return (
      <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => openChat(item)}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-undo-outline" size={26} color="#333333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New message</Text>
        </View>

        {/* SEARCH INPUT ROW */}
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

        {/* THIN DIVIDER LINE */}
        <View style={styles.divider} />

        {/* LIST */}
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

        {/* BLUE FOOTER */}
        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/luminus_text_logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}