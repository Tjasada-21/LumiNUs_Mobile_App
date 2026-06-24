import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAlumniProfile } from "../services/alumniQueries";
import { createPost, updatePost } from "../services/postQueries";
import { getFollowing } from "../services/connectionQueries";
import styles from "../styles/CreatePostScreen.styles";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import { ThemedAlert } from "../components/ThemedAlert";

const extractMentionQuery = (value) => {
  const text = String(value ?? "");
  const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;
  const query = match[2] ?? "";
  const mentionStart = text.length - query.length - 1;
  return { query, mentionStart, mentionEnd: text.length };
};

const toMentionHandle = (firstName, lastName) => {
  const normalizedHandle = `${firstName ?? ""}_${lastName ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalizedHandle || "alumni";
};

const CreatePostScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets(); // Hook for dynamic safe area padding
  
  const { currentUserProfile } = useCurrentUserProfile();
  const editingPost = route.params?.post ?? null;
  const isEditMode = Boolean(editingPost?.id);
  
  const [postText, setPostText] = useState("");
  const [userData, setUserData] = useState(null);
  const [selectedAudience, setSelectedAudience] = useState("public");
  const [connections, setConnections] = useState([]);
  const [selectedPhotoUris, setSelectedPhotoUris] = useState([]);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState([]);
  const [selectedVideoUris, setSelectedVideoUris] = useState([]);
  const [existingPhotoItems, setExistingPhotoItems] = useState([]);
  const [removedExistingPhotoIds, setRemovedExistingPhotoIds] = useState([]);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isPickingVideo, setIsPickingVideo] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const canPost = postText.trim().length > 0 || selectedPhotoUris.length > 0 || existingPhotoItems.length > 0;

  const mentionContext = useMemo(() => {
    const text = String(postText ?? "");
    const cursor = selection && typeof selection.start === "number" ? selection.start : text.length;
    const before = text.slice(0, cursor);
    const match = before.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);
    if (!match) return null;
    const query = match[2] ?? "";
    const mentionStart = cursor - query.length - 1;
    const mentionEnd = cursor;
    return { query, mentionStart, mentionEnd };
  }, [postText, selection]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionContext) return [];
    const query = mentionContext.query.toLowerCase();
    return connections
      .map((connection, index) => {
        const firstName = connection?.first_name ?? "";
        const lastName = connection?.last_name ?? "";
        const name = `${connection?.first_name ?? ""} ${connection?.last_name ?? ""}`.trim() || "Alumni";
        return {
          id: connection?.id,
          name,
          handle: toMentionHandle(firstName, lastName),
          avatar: null, 
          _index: index,
        };
      })
      .filter((item) => !query ? true : item.name.toLowerCase().includes(query) || item.handle.includes(query))
      .slice(0, 5);
  }, [connections, mentionContext]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supaUser = await getCurrentUser();
        if (!supaUser) return;
        const profile = await getAlumniProfile(supaUser.id);
        const following = await getFollowing(supaUser.id).catch(() => []);
        setUserData(profile ?? null);
        setConnections(Array.isArray(following) ? following.map((f) => f.followed ?? f) : []);
      } catch (error) {
        console.error("Failed to fetch create post profile:", error);
        setConnections([]);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!editingPost) {
      setExistingPhotoItems([]);
      setRemovedExistingPhotoIds([]);
      setSelectedPhotoFiles([]);
      return;
    }
    setPostText(editingPost.caption ?? "");
    setSelectedAudience(editingPost.visibility ?? "public");
    setSelectedPhotoUris([]);
    setSelectedPhotoFiles([]);
    setSelectedVideoUris([]);
    setRemovedExistingPhotoIds([]);
    setExistingPhotoItems(
      Array.isArray(editingPost.images)
        ? editingPost.images.map((image) => ({ id: image?.id ?? null, uri: image?.image_url ?? image?.image_path ?? image?.uri ?? "" })).filter((image) => Boolean(image.uri))
        : []
    );
  }, [editingPost]);

  const getImageMimeType = (uri) => {
    const extension = uri.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "png": return "image/png";
      case "heic": return "image/heic";
      case "webp": return "image/webp";
      default: return "image/jpeg";
    }
  };

  const handlePickMedia = async (mediaType, setIsPickingState, onPickedMedia, permissionMessage) => {
    try {
      setIsPickingState(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== "granted") {
        ThemedAlert.alert("Permission required", permissionMessage, [{ text: "OK" }], { variant: "error" });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [mediaType],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        base64: false,
        quality: 0.85,
      });

      const pickedAssets = Array.isArray(result.assets)
        ? result.assets.filter((asset) => Boolean(asset?.uri))
        : result.uri ? [{ uri: result.uri, fileName: null, mimeType: null }] : [];

      if (pickedAssets.length > 0) onPickedMedia(pickedAssets);
    } catch (error) {
      console.error("Failed to pick media:", error);
      ThemedAlert.alert("Upload failed", "Unable to open the media library.", [{ text: "OK" }], { variant: "error" });
    } finally {
      setIsPickingState(false);
    }
  };

  const handlePickPhoto = () =>
    handlePickMedia(
      "images",
      setIsPickingPhoto,
      (pickedAssets) => {
        setSelectedPhotoUris(pickedAssets.map((asset) => asset.uri));
        const formattedFiles = pickedAssets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName ?? `post-image-${index}-${Date.now()}.jpg`,
          type: asset.mimeType ?? getImageMimeType(asset.uri),
        }));
        setSelectedPhotoFiles(formattedFiles);
      },
      "Permission to access photos is required to choose an image.",
    );

  const handleRemoveLocation = () => setSelectedLocation(null);

  const handleRemovePhoto = (uriToRemove) => {
    setSelectedPhotoUris((currentUris) => currentUris.filter((uri) => uri !== uriToRemove));
    setSelectedPhotoFiles((currentFiles) => currentFiles.filter((file) => file.uri !== uriToRemove));
  };

  const handleRemoveExistingPhoto = (imageId) => {
    setRemovedExistingPhotoIds((currentIds) => currentIds.includes(imageId) ? currentIds : [...currentIds, imageId]);
  };

  const previewPhotoItems = [
    ...existingPhotoItems
      .filter((image) => !removedExistingPhotoIds.includes(image.id))
      .map((image, index) => ({
        key: image.id ?? `existing-${index}`,
        uri: image.uri,
        type: "existing",
        imageId: image.id,
      })),
    ...selectedPhotoUris.map((uri, index) => ({
      key: `selected-${index}`,
      uri,
      type: "selected",
    })),
  ];

  const handleSubmitPost = async (isDraft = false) => {
    if (isSubmitting) return;
    if (!isDraft && !canPost) return;

    try {
      setIsSubmitting(true);
      setSubmitAction(isDraft ? "draft" : isEditMode && editingPost?.is_draft ? "publish-draft" : "publish");

      const supaUser = await getCurrentUser();
      if (!supaUser) {
        ThemedAlert.alert("Sign in required", "Please sign in again before creating a post.", [{ text: "OK" }], { variant: "error" });
        return;
      }

      const trimmedCaption = postText.trim();
      const mentionPattern = /@([a-zA-Z0-9_.-]+)/g;
      const foundHandles = new Set();
      let match;
      while ((match = mentionPattern.exec(trimmedCaption)) !== null) {
        if (match[1]) foundHandles.add(match[1].toLowerCase());
      }

      const mentionMap = new Map((connections || []).map((c) => [toMentionHandle(c?.first_name ?? "", c?.last_name ?? ""), c?.id]));
      const mentionedIds = Array.from(foundHandles).map((h) => mentionMap.get(h)).filter(Boolean);

      if (isEditMode) {
        await updatePost(editingPost.id, {
          caption: trimmedCaption,
          visibility: selectedAudience,
          is_draft: isDraft,
          images: selectedPhotoFiles,
          remove_image_ids: removedExistingPhotoIds,
          mentions: mentionedIds,
        });
      } else {
        await createPost(supaUser.id, {
          caption: trimmedCaption,
          visibility: selectedAudience,
          is_draft: isDraft,
          images: selectedPhotoFiles,
          mentions: mentionedIds,
        });
      }

      setPostText("");
      setSelectedAudience("public");
      setSelectedPhotoUris([]);
      setSelectedVideoUris([]);
      ThemedAlert.alert(
        isDraft ? "Draft saved" : isEditMode ? "Post updated" : "Post created",
        isDraft ? "Your draft was saved successfully." : isEditMode ? "Your post was updated successfully." : "Your post was added successfully.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
        { variant: "success" }
      );
    } catch (error) {
      console.error("[CreatePost] Error during submission:", error);
      const errorMsg = error?.message || error?.toString?.() || "Unknown error";
      ThemedAlert.alert("Upload failed", isEditMode ? `Unable to update your post: ${errorMsg}` : `Unable to create your post: ${errorMsg}`, [{ text: "OK" }], { variant: "error" });
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  const handleMentionPick = (mentionHandle) => {
    if (!mentionContext) return;
    setPostText((currentText) => {
      const safeText = String(currentText ?? "");
      const prefix = safeText.slice(0, mentionContext.mentionStart);
      const suffix = safeText.slice(mentionContext.mentionEnd);
      return `${prefix}@${mentionHandle} ${suffix}`;
    });
  };

  const toggleAudience = () => {
    setSelectedAudience((prev) => (prev === "public" ? "private" : "public"));
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        
        {/* --- HEADER --- */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="arrow-back" size={26} color="#31429B" />
            </Pressable>
            <Text style={styles.headerTitle}>{isEditMode ? "Edit Post" : "Add New Post"}</Text>
          </View>
          
          <View style={styles.headerRight}>
            <Pressable 
              style={styles.headerDraftsButton} 
              onPress={() => handleSubmitPost(true)}
              disabled={isSubmitting}
            >
              <Ionicons name="time" size={22} color="#64748B" />
            </Pressable>
            
            <Pressable 
              style={[styles.headerPostButton, !canPost && styles.headerPostButtonDisabled]} 
              onPress={() => handleSubmitPost(false)}
              disabled={!canPost || isSubmitting}
            >
              <Ionicons name="send" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerPostButtonText}>{isEditMode ? "Update" : "Post"}</Text>
            </Pressable>
          </View>
        </View>

        {/* --- CONTENT AREA (Flexible height) --- */}
        <ScrollView 
          style={{ flex: 1 }} // Ensures scroll view pushes toolbar to bottom
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.content}
        >
          
          <TextInput
            value={postText}
            onChangeText={(t) => setPostText(t)}
            onSelectionChange={({ nativeEvent: { selection } }) => setSelection(selection)}
            selection={selection}
            placeholder="Share your thoughts..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            style={styles.postInput}
          />

          {mentionContext && mentionSuggestions.length > 0 ? (
            <View style={styles.mentionPanel}>
              {mentionSuggestions.map((item) => (
                <Pressable
                  key={String(item.id ?? `mention-${item._index}`)}
                  style={styles.mentionItem}
                  onPress={() => handleMentionPick(item.handle)}
                >
                  <Text style={styles.mentionName} numberOfLines={1}>
                    @{item.handle}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* --- IMAGE PREVIEWS --- */}
          {previewPhotoItems.length > 0 && (
            <View style={styles.previewImageWrap}>
              {previewPhotoItems.length === 1 ? (
                <View style={styles.previewMediaItem}>
                  <Image
                    source={{ uri: previewPhotoItems[0].uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.previewRemoveButton}
                    onPress={() =>
                      previewPhotoItems[0].type === "existing"
                        ? handleRemoveExistingPhoto(previewPhotoItems[0].imageId)
                        : handleRemovePhoto(previewPhotoItems[0].uri)
                    }
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.previewGrid}>
                  {previewPhotoItems.map((item) => (
                    <View key={item.key} style={styles.previewGridItem}>
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.previewThumbnail}
                        resizeMode="cover"
                      />
                      <Pressable
                        style={styles.previewRemoveButton}
                        onPress={() =>
                          item.type === "existing"
                            ? handleRemoveExistingPhoto(item.imageId)
                            : handleRemovePhoto(item.uri)
                        }
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

        </ScrollView>

        {/* --- BOTTOM TOOLBAR PILLS (Respects Safe Area) --- */}
        <View style={[styles.bottomToolbar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable style={styles.pillButton} onPress={toggleAudience}>
            <Text style={styles.pillText}>
              {selectedAudience === "public" ? "To Anyone" : "To Friends"}
            </Text>
            <Ionicons name="caret-down" size={12} color="#1C1C1E" style={{ marginLeft: 6 }} />
          </Pressable>

          <Pressable style={styles.pillButton} onPress={handlePickPhoto}>
            <Ionicons name="image-outline" size={16} color="#1C1C1E" style={{ marginRight: 6 }} />
            <Text style={styles.pillText}>Add Image/Video</Text>
          </Pressable>
        </View>

      </SafeAreaView>

      <Modal visible={isSubmitting} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.uploadModalBackdrop}>
          <View style={styles.uploadModalCard}>
            <ActivityIndicator size="large" color="#31429B" />
            <Text style={styles.uploadModalTitle}>Posting...</Text>
            <Text style={styles.uploadModalText}>Please wait while we upload your content.</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CreatePostScreen;