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
import styles from "../styles/SearchMessageScreen.styles";

export default function SearchMessageScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Get the currently logged-in user so we don't show them in the search list
      const currentUser = await getCurrentUser().catch(() => null);
      const currentUserId = currentUser?.id;
      const currentUserType = currentUser?.user_type || 'alumni';

      // Fetch all alumni from Supabase
      const { data: alumniData, error: alumniError } = await supabase
        .from("alumnis")
        .select("id, first_name, last_name, alumni_photo")
        .order("first_name", { ascending: true });

      if (alumniError) {
        console.error("Error fetching alumni:", alumniError);
      }

      // Fetch all admins from Supabase
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("id, admin_first_name, admin_last_name, photo, admin_role")
        .order("admin_first_name", { ascending: true });

      if (adminError) {
        console.error("Error fetching admins:", adminError);
      }

      // Combine and normalize the data with unique composite IDs
      const allUsers = [];
      
      // Add alumni with composite ID
      (alumniData || []).forEach(alumni => {
        if (!(currentUserType === 'alumni' && alumni.id === currentUserId)) {
          allUsers.push({
            compositeId: `alumni_${alumni.id}`,
            id: alumni.id,
            user_type: 'alumni',
            first_name: alumni.first_name,
            last_name: alumni.last_name,
            alumni_photo: alumni.alumni_photo,
            displayName: `${alumni.first_name || ""} ${alumni.last_name || ""}`.trim() || "Alumni"
          });
        }
      });

      // Add admins with composite ID
      (adminData || []).forEach(admin => {
        if (!(currentUserType === 'admin' && admin.id === currentUserId)) {
          allUsers.push({
            compositeId: `admin_${admin.id}`,
            id: admin.id,
            user_type: 'admin',
            first_name: admin.admin_first_name,
            last_name: admin.admin_last_name,
            alumni_photo: admin.photo,
            displayName: `${admin.admin_first_name || ""} ${admin.admin_last_name || ""}`.trim() || "Admin",
            admin_role: admin.admin_role
          });
        }
      });

      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedUsers = users.filter(user => {
    const fullName = user.displayName.toLowerCase();
    const userType = user.user_type.toLowerCase();
    const searchTerm = searchQuery.toLowerCase();
    
    return fullName.includes(searchTerm) || userType.includes(searchTerm);
  });

  const openChat = (selectedUser) => {
    const parentNavigator = navigation.getParent?.();
    const params = {
      contactId: selectedUser.id,
      contactName: selectedUser.displayName,
      contactAvatar: getAvatarUri(selectedUser.displayName, selectedUser.alumni_photo),
      receiverType: selectedUser.user_type,
    };

    if (parentNavigator?.navigate) {
      parentNavigator.navigate("ConvoScreen", params);
    } else {
      navigation.navigate("ConvoScreen", params);
    }
  };

const renderItem = ({ item }) => {
    const avatarUrl = getAvatarUri(item.displayName, item.alumni_photo);
    const isAdmin = item.user_type === 'admin';

    return (
      <TouchableOpacity 
        style={styles.listItem} 
        activeOpacity={0.7} 
        onPress={() => openChat(item)}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{item.displayName}</Text>
            {isAdmin && item.admin_role && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>{item.admin_role}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#31429B" />
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
          <Text style={styles.headerTitle}>Search</Text>
        </View>

        {/* PILL-SHAPED SEARCH BAR */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#888888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search alumni or admin"
              placeholderTextColor="#888888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true} 
            />
          </View>
        </View>

        {/* RESULTS LIST */}
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : (
          <FlatList
            data={displayedUsers}
            keyExtractor={(item) => item.compositeId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerWrap}>
                <Text style={styles.emptyText}>
                  {searchQuery.length > 0 
                    ? "No results found." 
                    : "Type to start searching for alumni or admin..."}
                </Text>
              </View>
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