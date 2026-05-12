import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { getCurrentUser } from '../services/supabaseAuth';
import { getAlumniProfile } from '../services/alumniQueries';
import { createPost, updatePost } from '../services/postQueries';
import { getFollowing } from '../services/connectionQueries';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/CreatePostScreen.styles';
import { getAvatarUri } from '../utils/imageUtils';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';

import { ThemedAlert } from '../components/ThemedAlert';

const extractMentionQuery = (value) => {
    const text = String(value ?? '');
    const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (!match) {
        return null;
    }

    const query = match[2] ?? '';
    const mentionStart = text.length - query.length - 1;

    return {
        query,
        mentionStart,
        mentionEnd: text.length,
    };
};

const toMentionHandle = (firstName, lastName) => {
    const normalizedHandle = `${firstName ?? ''}_${lastName ?? ''}`
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    return normalizedHandle || 'alumni';
};

const CreatePostScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { currentUserProfile } = useCurrentUserProfile();
    const editingPost = route.params?.post ?? null;
    const isEditMode = Boolean(editingPost?.id);
    const [postText, setPostText] = useState('');
    const [userData, setUserData] = useState(null);
    const [selectedAudience, setSelectedAudience] = useState('public');
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

    const canPost = postText.trim().length > 0 || selectedPhotoUris.length > 0;

    const mentionContext = useMemo(() => {
        const text = String(postText ?? '');
        const cursor = (selection && typeof selection.start === 'number') ? selection.start : text.length;
        const before = text.slice(0, cursor);
        const match = before.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);

        if (!match) return null;

        const query = match[2] ?? '';
        const mentionStart = cursor - (query.length) - 1;
        const mentionEnd = cursor;

        return { query, mentionStart, mentionEnd };
    }, [postText, selection]);

    const mentionSuggestions = useMemo(() => {
        if (!mentionContext) {
            return [];
        }

        const query = mentionContext.query.toLowerCase();

        return connections
            .map((connection, index) => {
                const firstName = connection?.first_name ?? '';
                const lastName = connection?.last_name ?? '';
                const name = `${connection?.first_name ?? ''} ${connection?.last_name ?? ''}`.trim() || 'Alumni';
                return {
                    id: connection?.id,
                    name,
                    handle: toMentionHandle(firstName, lastName),
                        avatar: getAvatarUri(name, connection?.alumni_photo),
                    _index: index,
                };
            })
            .filter((item) => (!query ? true : item.name.toLowerCase().includes(query) || item.handle.includes(query)))
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
                console.error('Failed to fetch create post profile:', error);
                setConnections([]);
            }
        };

        fetchProfile();
    }, []);

    const profileName = useMemo(() => {
        if (!userData) {
            return 'Alumni';
        }

        return [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim() || 'Alumni';
    }, [userData]);

    const profileImageUri = useMemo(() => {
        return getAvatarUri(profileName, currentUserProfile?.alumni_photo ?? userData?.alumni_photo);
    }, [currentUserProfile?.alumni_photo, profileName, userData?.alumni_photo]);

    const audienceOptions = [
        { value: 'public', label: 'Public', icon: 'earth-outline' },
        { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
        { value: 'friends', label: 'Friends', icon: 'people-outline' },
    ];

    useEffect(() => {
        if (!editingPost) {
            setExistingPhotoItems([]);
            setRemovedExistingPhotoIds([]);
            setSelectedPhotoFiles([]);
            return;
        }

        setPostText(editingPost.caption ?? '');
        setSelectedAudience(editingPost.visibility ?? 'public');
        setSelectedPhotoUris([]);
        setSelectedPhotoFiles([]);
        setSelectedVideoUris([]);
        setRemovedExistingPhotoIds([]);
        setExistingPhotoItems(
            Array.isArray(editingPost.images)
                ? editingPost.images
                    .map((image) => ({
                        id: image?.id ?? null,
                        uri: image?.image_url ?? image?.image_path ?? image?.uri ?? '',
                    }))
                    .filter((image) => Boolean(image.uri))
                : []
        );
    }, [editingPost]);

    const getImageMimeType = (uri) => {
        const extension = uri.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'png': return 'image/png';
            case 'heic': return 'image/heic';
            case 'webp': return 'image/webp';
            default: return 'image/jpeg';
        }
    };

    const handlePickMedia = async (mediaType, setIsPickingState, onPickedMedia, permissionMessage) => {
        try {
            setIsPickingState(true);

            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.status !== 'granted') {
                ThemedAlert.alert('Permission required', permissionMessage, [{ text: 'OK' }], { variant: 'error' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: [mediaType],
                allowsEditing: false,
                allowsMultipleSelection: true,
                selectionLimit: 10,
                base64: false, // Turned off to avoid memory overload, we use FormData now
                quality: 0.85,
            });

            const pickedAssets = Array.isArray(result.assets)
                ? result.assets.filter((asset) => Boolean(asset?.uri))
                : result.uri
                    ? [{ uri: result.uri, fileName: null, mimeType: null }]
                    : [];

            if (pickedAssets.length > 0) {
                onPickedMedia(pickedAssets);
            }
        } catch (error) {
            console.error('Failed to pick media:', error);
            ThemedAlert.alert('Upload failed', 'Unable to open the media library.', [{ text: 'OK' }], { variant: 'error' });
        } finally {
            setIsPickingState(false);
        }
    };

    const handlePickPhoto = () => handlePickMedia(
        'images',
        setIsPickingPhoto,
        (pickedAssets) => {
            setSelectedPhotoUris(pickedAssets.map((asset) => asset.uri));
            
            // Format files perfectly for React Native's FormData object
            const formattedFiles = pickedAssets.map((asset, index) => ({
                uri: asset.uri,
                name: asset.fileName ?? `post-image-${index}-${Date.now()}.jpg`,
                type: asset.mimeType ?? getImageMimeType(asset.uri)
            }));
            
            setSelectedPhotoFiles(formattedFiles);
        },
        'Permission to access photos is required to choose an image.'
    );

    const handlePickVideo = () => handlePickMedia('videos', setIsPickingVideo, setSelectedVideoUris, 'Permission to access photos is required to choose a video.');

    const handleRemoveLocation = () => setSelectedLocation(null);

    const handlePickLocation = async () => {
        try {
            setLocationModalVisible(true);
            setLocationLoading(true);

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                ThemedAlert.alert('Permission required', 'Location permission is required to pick your current location.', [{ text: 'OK' }], { variant: 'error' });
                setLocationLoading(false);
                setLocationModalVisible(false);
                return;
            }

            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            const rev = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => []);
            const first = Array.isArray(rev) && rev.length > 0 ? rev[0] : null;

            const pretty = first
                ? [first.name, first.street, first.city, first.region].filter(Boolean).join(', ')
                : `Lat ${pos.coords.latitude.toFixed(4)}, Lon ${pos.coords.longitude.toFixed(4)}`;

            setSelectedLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: pretty });
        } catch (error) {
            console.error('[CreatePost] Failed to pick location:', error);
            ThemedAlert.alert('Location failed', 'Unable to get current location.');
        } finally {
            setLocationLoading(false);
            setLocationModalVisible(false);
        }
    };

    const handleRemovePhoto = (uriToRemove) => {
        setSelectedPhotoUris((currentUris) => currentUris.filter((uri) => uri !== uriToRemove));
        setSelectedPhotoFiles((currentFiles) => currentFiles.filter((file) => file.uri !== uriToRemove));
    };

    const handleRemoveExistingPhoto = (imageId) => {
        setRemovedExistingPhotoIds((currentIds) => (currentIds.includes(imageId) ? currentIds : [...currentIds, imageId]));
    };

    const handleRemoveVideo = (uriToRemove) => {
        setSelectedVideoUris((currentUris) => currentUris.filter((uri) => uri !== uriToRemove));
    };

    const previewPhotoItems = [
        ...existingPhotoItems
            .filter((image) => !removedExistingPhotoIds.includes(image.id))
            .map((image, index) => ({
                key: image.id ?? `existing-${index}`,
                uri: image.uri,
                type: 'existing',
                imageId: image.id,
            })),
        ...selectedPhotoUris.map((uri, index) => ({
            key: `selected-${index}`,
            uri,
            type: 'selected',
        })),
    ];

    const handleSubmitPost = async (isDraft = false) => {
        if (isSubmitting) return;

        if (selectedVideoUris.length > 0) {
            ThemedAlert.alert(
                'Unsupported media',
                'Video uploads are not supported yet. Remove the selected video(s) and try again.',
                [{ text: 'OK' }],
                { variant: 'error' }
            );
            return;
        }

        if (!isDraft && !canPost) return;

        try {
            setIsSubmitting(true);
            setSubmitAction(
                isDraft
                    ? 'draft'
                    : isEditMode && editingPost?.is_draft
                        ? 'publish-draft'
                        : 'publish'
            );

            const supaUser = await getCurrentUser();
            if (!supaUser) {
                ThemedAlert.alert('Sign in required', 'Please sign in again before creating a post.', [{ text: 'OK' }], { variant: 'error' });
                return;
            }

            const trimmedCaption = postText.trim();

            // Extract mention handles from the caption and map to alumni IDs
            const mentionPattern = /@([a-zA-Z0-9_.-]+)/g;
            const foundHandles = new Set();
            let match;
            while ((match = mentionPattern.exec(trimmedCaption)) !== null) {
                if (match[1]) foundHandles.add(match[1].toLowerCase());
            }

            const mentionMap = new Map((connections || []).map((c) => [toMentionHandle(c?.first_name ?? '', c?.last_name ?? ''), c?.id]));
            const mentionedIds = Array.from(foundHandles).map((h) => mentionMap.get(h)).filter(Boolean);

            if (isEditMode) {
                await updatePost(editingPost.id, {
                    caption: trimmedCaption,
                    visibility: selectedAudience,
                    is_draft: isDraft,
                    images: selectedPhotoFiles, // Now perfectly formatted for FormData
                    remove_image_ids: removedExistingPhotoIds,
                    mentions: mentionedIds,
                });
            } else {
                try {
                    await createPost(supaUser.id, {
                        caption: trimmedCaption,
                        visibility: selectedAudience,
                        is_draft: isDraft,
                        images: selectedPhotoFiles, // Now perfectly formatted for FormData
                        mentions: mentionedIds,
                    });
                } catch (createErr) {
                    console.error('[CreatePost] Create post failed:', createErr?.message || createErr);
                    throw createErr;
                }
            }

            setPostText('');
            setSelectedAudience('public');
            setSelectedPhotoUris([]);
            setSelectedVideoUris([]);
            ThemedAlert.alert(isDraft ? 'Draft saved' : isEditMode ? 'Post updated' : 'Post created', isDraft ? 'Your draft was saved successfully.' : isEditMode ? 'Your post was updated successfully.' : 'Your post was added successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ], { variant: 'success' });
        } catch (error) {
            console.error('[CreatePost] Error during submission:', error);
            const errorMsg = error?.message || error?.toString?.() || 'Unknown error';
            ThemedAlert.alert('Upload failed', isEditMode ? `Unable to update your post: ${errorMsg}` : `Unable to create your post: ${errorMsg}`, [{ text: 'OK' }], { variant: 'error' });
        } finally {
            setIsSubmitting(false);
            setSubmitAction(null);
        }
    };

    const getSubmitModalTitle = () => {
        if (submitAction === 'draft') return 'Saving your draft';
        if (submitAction === 'publish-draft') return 'Publishing your draft';
        if (submitAction === 'publish') return isEditMode ? 'Updating your post' : 'Posting your content';
        return isEditMode ? 'Updating your post' : 'Posting your content';
    };

    const getSubmitModalText = () => {
        if (submitAction === 'draft') return 'Please wait while your draft is saved.';
        if (submitAction === 'publish-draft') return 'Please wait while your draft is published.';
        if (submitAction === 'publish') return isEditMode ? 'Please wait while your changes are saved.' : 'Please wait while your post uploads.';
        return isEditMode ? 'Please wait while your changes are saved.' : 'Please wait while your post uploads.';
    };

    const isPublishDisabled = !isEditMode && !canPost;

    const handleMentionPick = (mentionHandle) => {
        if (!mentionContext) return;

        setPostText((currentText) => {
            const safeText = String(currentText ?? '');
            const prefix = safeText.slice(0, mentionContext.mentionStart);
            const suffix = safeText.slice(mentionContext.mentionEnd);
            return `${prefix}@${mentionHandle} ${suffix}`;
        });
    };

    return (
        <>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    <BrandHeader />

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        <View style={styles.card}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
                                    <Ionicons name="arrow-back" size={22} color="#31429B" />
                                </Pressable>
                                <Pressable onPress={() => navigation.navigate('DraftsScreen')} style={{ padding: 6 }} hitSlop={8} accessibilityLabel="Open drafts">
                                    <Ionicons name="document-text-outline" size={20} color="#31429B" />
                                </Pressable>
                            </View>

                            {isEditMode ? <Text style={styles.editNotice}>Editing this post. Keep the current images or add new ones below.</Text> : null}

                            <View style={styles.cardHeader}>
                                <View style={styles.audienceOptionsRow}>
                                    {audienceOptions.map((option) => {
                                        const isSelected = selectedAudience === option.value;

                                        return (
                                            <Pressable
                                                key={option.value}
                                                style={[styles.audiencePill, isSelected && styles.audiencePillSelected]}
                                                onPress={() => setSelectedAudience(option.value)}
                                                android_ripple={{ color: '#EAF0FF' }}
                                            >
                                                <Ionicons name={option.icon} size={14} color="#31429B" />
                                                <Text style={styles.audiencePillText}>{option.label}</Text>
                                                {isSelected ? <Ionicons name="checkmark-circle" size={14} color="#31429B" style={styles.audienceCheckIcon} /> : null}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.composeRow}>
                                <Image source={{ uri: profileImageUri }} style={styles.avatar} />
                                <View style={styles.composeBody}>
                                    <Text style={styles.composeName}>{profileName}</Text>
                                </View>
                            </View>

                            <TextInput
                                value={postText}
                                onChangeText={(t) => setPostText(t)}
                                onSelectionChange={({ nativeEvent: { selection } }) => setSelection(selection)}
                                selection={selection}
                                placeholder="What's on your mind?"
                                placeholderTextColor="#8A94A6"
                                multiline
                                textAlignVertical="top"
                                style={[styles.input, styles.postInput]}
                            />

                            {mentionContext && mentionSuggestions.length > 0 ? (
                                <View style={styles.mentionPanel}>
                                    {mentionSuggestions.map((item) => (
                                        <Pressable
                                            key={String(item.id ?? `mention-${item._index}`)}
                                            style={styles.mentionItem}
                                            onPress={() => handleMentionPick(item.handle)}
                                        >
                                            <Image source={{ uri: item.avatar }} style={styles.mentionAvatar} />
                                            <Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            ) : null}

                            <View style={styles.toolbarRow}>
                                <Pressable style={styles.toolbarButton} onPress={handlePickPhoto} android_ripple={{ color: '#EAF0FF' }} disabled={isPickingPhoto}>
                                    <Ionicons name="image-outline" size={18} color="#31429B" />
                                    <Text style={styles.toolbarButtonText}>Photo</Text>
                                </Pressable>

                                <Pressable style={styles.toolbarButton} onPress={handlePickVideo} android_ripple={{ color: '#EAF0FF' }} disabled={isPickingVideo}>
                                    <Ionicons name="videocam-outline" size={18} color="#31429B" />
                                    <Text style={styles.toolbarButtonText}>Video</Text>
                                </Pressable>

                                <Pressable style={styles.toolbarButton} onPress={handlePickLocation} android_ripple={{ color: '#EAF0FF' }}>
                                    <Ionicons name="location-outline" size={18} color="#31429B" />
                                    <Text style={styles.toolbarButtonText}>Location</Text>
                                </Pressable>
                            </View>

                            <View style={styles.previewCard}>
                                <View style={styles.previewImageWrap}>
                                    {selectedLocation ? (
                                        <View style={styles.locationPreviewRow}>
                                            <Ionicons name="location-outline" size={18} color="#31429B" />
                                            <Text style={styles.locationPreviewText} numberOfLines={1}>{selectedLocation.label}</Text>
                                            <Pressable style={styles.previewRemoveButton} onPress={handleRemoveLocation}>
                                                <Ionicons name="close" size={14} color="#FFFFFF" />
                                            </Pressable>
                                        </View>
                                    ) : null}
                                    {previewPhotoItems.length > 0 ? (
                                        previewPhotoItems.length === 1 ? (
                                            <View style={styles.previewMediaItem}>
                                                <Image source={{ uri: previewPhotoItems[0].uri }} style={styles.previewImage} resizeMode="contain" />
                                                <Pressable
                                                    style={styles.previewRemoveButton}
                                                    onPress={() => (previewPhotoItems[0].type === 'existing' ? handleRemoveExistingPhoto(previewPhotoItems[0].imageId) : handleRemovePhoto(previewPhotoItems[0].uri))}
                                                >
                                                    <Ionicons name="close" size={14} color="#FFFFFF" />
                                                </Pressable>
                                            </View>
                                        ) : (
                                            <View style={styles.previewGrid}>
                                                {previewPhotoItems.map((item) => (
                                                    <View key={item.key} style={styles.previewGridItem}>
                                                        <Image source={{ uri: item.uri }} style={styles.previewThumbnail} resizeMode="contain" />
                                                        <Pressable
                                                            style={styles.previewRemoveButton}
                                                            onPress={() => (item.type === 'existing' ? handleRemoveExistingPhoto(item.imageId) : handleRemovePhoto(item.uri))}
                                                        >
                                                            <Ionicons name="close" size={14} color="#FFFFFF" />
                                                        </Pressable>
                                                    </View>
                                                ))}
                                            </View>
                                        )
                                    ) : selectedVideoUris.length === 1 ? (
                                            <View style={styles.previewMediaItem}>
                                                <View style={styles.previewVideoTile}>
                                                    <Ionicons name="play-circle-outline" size={44} color="#31429B" />
                                                    <Text style={styles.previewVideoText}>Video selected</Text>
                                                </View>
                                                <Pressable style={styles.previewRemoveButton} onPress={() => handleRemoveVideo(selectedVideoUris[0])}>
                                                    <Ionicons name="close" size={14} color="#FFFFFF" />
                                                </Pressable>
                                            </View>
                                        ) : selectedVideoUris.length > 1 ? (
                                            <View style={styles.previewGrid}>
                                                {selectedVideoUris.map((uri, index) => (
                                                    <View key={`video-${index}`} style={styles.previewGridItem}>
                                                        <View style={styles.previewVideoTile}>
                                                            <Ionicons name="play-circle-outline" size={44} color="#31429B" />
                                                            <Text style={styles.previewVideoText}>Video selected</Text>
                                                        </View>
                                                        <Pressable style={styles.previewRemoveButton} onPress={() => handleRemoveVideo(uri)}>
                                                            <Ionicons name="close" size={14} color="#FFFFFF" />
                                                        </Pressable>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <>
                                                <Ionicons name="image-outline" size={30} color="#9CA3AF" />
                                                <Text style={styles.previewText}>Media preview will appear here.</Text>
                                            </>
                                        )
                                    }
                                </View>
                            </View>

                            <View style={styles.footerRow}>
                                <Pressable style={styles.saveDraftButton} android_ripple={{ color: '#EAF0FF' }} onPress={() => handleSubmitPost(true)} disabled={isSubmitting}>
                                    <Text style={styles.saveDraftText}>Save Draft</Text>
                                </Pressable>


                                            <Modal visible={locationModalVisible} transparent animationType="fade" statusBarTranslucent>
                                                <View style={styles.uploadModalBackdrop}>
                                                    <View style={styles.uploadModalCard}>
                                                        <ActivityIndicator size="large" color="#31429B" />
                                                        <Text style={styles.uploadModalTitle}>Getting current location</Text>
                                                        <Text style={styles.uploadModalText}>{locationLoading ? 'Please wait while we fetch your location.' : 'Preparing location...'}</Text>
                                                    </View>
                                                </View>
                                            </Modal>
                                <Pressable style={[styles.postButton, isPublishDisabled && styles.postButtonDisabled]} onPress={() => handleSubmitPost(false)} android_ripple={{ color: '#24346F' }} disabled={isPublishDisabled || isSubmitting}>
                                    <Text style={styles.postButtonText}>{isEditMode ? 'Update' : 'Post'}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>

            <Modal visible={isSubmitting} transparent animationType="fade" statusBarTranslucent>
                <View style={styles.uploadModalBackdrop}>
                    <View style={styles.uploadModalCard}>
                        <ActivityIndicator size="large" color="#31429B" />
                        <Text style={styles.uploadModalTitle}>{getSubmitModalTitle()}</Text>
                        <Text style={styles.uploadModalText}>{getSubmitModalText()}</Text>
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default CreatePostScreen;
