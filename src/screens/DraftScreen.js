import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getCurrentUser } from "../services/supabaseAuth";
import { getUserDrafts, deletePost } from "../services/postQueries";
import BrandHeader from "../components/BrandHeader";
import { ThemedAlert } from "../components/ThemedAlert";

const DraftsScreen = () => {
  const navigation = useNavigation();
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const supaUser = await getCurrentUser();
      if (supaUser?.id) {
        const userDrafts = await getUserDrafts(supaUser.id);
        setDrafts(userDrafts);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [fetchDrafts]),
  );

  const handleDeleteDraft = (draftId) => {
    ThemedAlert.alert(
      "Discard Draft",
      "Are you sure you want to delete this draft?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            const success = await deletePost(draftId).catch(() => false);
            if (success) {
              setDrafts((prev) => prev.filter((d) => d.id !== draftId));
            } else {
              ThemedAlert.alert("Error", "Failed to delete the draft.");
            }
          },
        },
      ],
    );
  };

  const openDraft = (draft) => {
    // Navigate back to the composer, passing the draft data to populate the fields
    navigation.navigate("CreatePostScreen", { post: draft });
  };

  const renderDraftItem = ({ item }) => {
    const hasImage = item.images && item.images.length > 0;
    const previewImage = hasImage
      ? item.images[0].image_url || item.images[0].image_path
      : null;
    const dateStr = new Date(item.created_at).toLocaleDateString();

    return (
      <TouchableOpacity
        style={styles.draftCard}
        activeOpacity={0.7}
        onPress={() => openDraft(item)}
      >
        <View style={styles.draftContent}>
          <Text style={styles.draftDate}>Saved on {dateStr}</Text>
          <Text style={styles.draftText} numberOfLines={2}>
            {item.caption ? item.caption : "(No text content)"}
          </Text>
          {hasImage && (
            <View style={styles.imageBadge}>
              <Ionicons name="image-outline" size={14} color="#31429B" />
              <Text style={styles.imageBadgeText}>
                {item.images.length} Image(s)
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteDraft(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <BrandHeader />

        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#31429B" />
          </TouchableOpacity>
          <Text style={styles.title}>Your Drafts</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : (
          <FlatList
            data={drafts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderDraftItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color="#9CA3AF"
                />
                <Text style={styles.emptyText}>You have no saved drafts.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  listContent: { padding: 16, flexGrow: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: { marginTop: 12, fontSize: 15, color: "#6B7280" },
  draftCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: "center",
  },
  draftContent: { flex: 1, paddingRight: 12 },
  draftDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 6,
    fontWeight: "600",
  },
  draftText: { fontSize: 15, color: "#1F2937", lineHeight: 20 },
  imageBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#EEF2FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageBadgeText: {
    fontSize: 12,
    color: "#31429B",
    marginLeft: 4,
    fontWeight: "600",
  },
  deleteButton: { padding: 8, backgroundColor: "#FEF2F2", borderRadius: 8 },
});

export default DraftsScreen;
