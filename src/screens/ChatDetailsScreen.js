import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, View, Text, Image, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAvatarUri } from '../utils/imageUtils';
import { addGroupMember, getGroupChat, removeGroupMember } from '../services/messageQueries';
import { getCurrentUser } from '../services/supabaseAuth';
import { getFollowers, getFollowing } from '../services/connectionQueries';
import { ThemedAlert } from '../components/ThemedAlert';
import supabase from '../services/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ChatDetailsScreen = ({ route, navigation }) => {
  // Extract route params
  const routeContact = route?.params?.contact;
  const routeGroup = route?.params?.group;
  const routeGroupId = routeGroup?.id ?? route?.params?.groupId ?? null;
  const dmProfileUserId = routeContact?.id ?? routeContact?.alumni_id ?? null;
  const [resolvedGroup, setResolvedGroup] = useState(routeGroup ?? null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [candidateMembers, setCandidateMembers] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [isEditGroupModalVisible, setIsEditGroupModalVisible] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState(routeGroup?.name ?? '');
  const [groupAvatarDraft, setGroupAvatarDraft] = useState(routeGroup?.avatar_url ?? routeGroup?.avatar ?? '');
  const [isSavingGroupDetails, setIsSavingGroupDetails] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      const currentUser = await getCurrentUser().catch(() => null);
      if (active) {
        setCurrentUserId(currentUser?.id ?? null);
      }
    };

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  // Limit rendering to 50 items to prevent memory overload, and filter by search
  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return candidateMembers.slice(0, 50); // Hard limit for default render
    }

    return candidateMembers
      .filter((member) => member.name.toLowerCase().includes(query))
      .slice(0, 50);
  }, [candidateMembers, searchQuery]);

  const applyFetchedGroup = useCallback((fetchedGroup) => {
    setResolvedGroup((previousGroup) => ({
      ...(previousGroup ?? {}),
      ...fetchedGroup,
      members: Array.isArray(fetchedGroup?.members)
        ? fetchedGroup.members
        : Array.isArray(previousGroup?.members)
          ? previousGroup.members
          : [],
    }));
  }, []);

  useEffect(() => {
    let active = true;

    const loadGroupDetails = async () => {
      if (!routeGroupId) {
        if (active) {
          setResolvedGroup(routeGroup ?? null);
        }
        return;
      }

      try {
        setIsLoadingMembers(true);
        const fetchedGroup = await getGroupChat(routeGroupId).catch(() => null);

        if (!active) {
          return;
        }

        if (fetchedGroup) {
          applyFetchedGroup(fetchedGroup);
        } else {
          setResolvedGroup(routeGroup ?? null);
        }
      } finally {
        if (active) {
          setIsLoadingMembers(false);
        }
      }
    };

    loadGroupDetails();

    return () => {
      active = false;
    };
  }, [applyFetchedGroup, routeGroup, routeGroupId]);

  const groupData = resolvedGroup || routeGroup || {
    name: 'Project Group',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    members: [],
    media: [],
  };

  const normalizedMembers = useMemo(() => {
    const rawMembers = Array.isArray(groupData?.members) ? groupData.members : [];

    return rawMembers.map((member, index) => {
      const profile = member?.alumni ?? member ?? {};
      const firstName = profile?.first_name ?? profile?.admin_first_name ?? '';
      const lastName = profile?.last_name ?? profile?.admin_last_name ?? '';
      const fallbackName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const fullName = (profile?.name ?? member?.name ?? fallbackName) || 'Member';
      const avatar = profile?.avatar
        ?? profile?.photo
        ?? profile?.alumni_photo
        ?? profile?.profile_photo
        ?? member?.avatar
        ?? member?.photo
        ?? member?.alumni_photo
        ?? member?.profile_photo
        ?? null;

      return {
        id: profile?.id ?? member?.alumni_id ?? member?.member_id ?? member?.id ?? index,
        alumniId: profile?.id ?? member?.alumni_id ?? member?.member_id ?? member?.id ?? index,
        name: fullName,
        avatar: getAvatarUri(fullName, avatar),
        role: member?.role ?? profile?.role ?? 'alumni',
      };
    });
  }, [groupData?.members]);

  const isCurrentUserAdmin = useMemo(() => {
    if (!currentUserId) {
      return false;
    }

    return normalizedMembers.some((member) => String(member.alumniId) === String(currentUserId) && String(member.role).toLowerCase() === 'admin');
  }, [currentUserId, normalizedMembers]);

  useEffect(() => {
    setGroupNameDraft(groupData?.name ?? '');
    setGroupAvatarDraft(groupData?.avatar_url ?? groupData?.avatar ?? '');
  }, [groupData?.avatar, groupData?.avatar_url, groupData?.name]);

  const existingMemberIds = useMemo(() => {
    const members = Array.isArray(groupData?.members) ? groupData.members : [];

    return new Set(
      members
        .map((member) => member?.alumni?.id ?? member?.alumni_id ?? member?.id)
        .filter(Boolean)
        .map((id) => String(id))
    );
  }, [groupData?.members]);

  const loadCandidateMembers = useCallback(async () => {
    if (!routeGroupId) {
      setCandidateMembers([]);
      return;
    }

    try {
      setIsLoadingCandidates(true);

      const currentUser = await getCurrentUser().catch(() => null);
      const currentAlumniId = currentUser?.id ?? null;

      if (!currentAlumniId) {
        setCandidateMembers([]);
        return;
      }

      const [followingRows, followerRows] = await Promise.all([
        getFollowing(currentAlumniId).catch(() => []),
        getFollowers(currentAlumniId).catch(() => []),
      ]);

      const candidatesMap = new Map();

      (followingRows || []).forEach((row) => {
        const alumni = row?.followed;
        if (!alumni?.id) return;
        candidatesMap.set(String(alumni.id), alumni);
      });

      (followerRows || []).forEach((row) => {
        const alumni = row?.follower;
        if (!alumni?.id) return;
        if (!candidatesMap.has(String(alumni.id))) {
          candidatesMap.set(String(alumni.id), alumni);
        }
      });

      const nextCandidates = Array.from(candidatesMap.values())
        .filter((alumni) => {
          const alumniId = String(alumni?.id ?? '');
          return alumniId && !existingMemberIds.has(alumniId);
        })
        .map((alumni) => {
          const fullName = `${alumni?.first_name ?? ''} ${alumni?.last_name ?? ''}`.trim() || 'Alumni';

          return {
            id: alumni.id,
            name: fullName,
            avatar: getAvatarUri(fullName, alumni?.alumni_photo),
          };
        });

      setCandidateMembers(nextCandidates);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [existingMemberIds, routeGroupId]);

  const uploadGroupAvatar = useCallback(async (imageSource) => {
    const isObject = typeof imageSource === 'object' && imageSource !== null;
    const uri = isObject ? imageSource.uri : imageSource;
    const safeName = isObject && imageSource.name
      ? imageSource.name
      : `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
    const mimeType = isObject && imageSource.type ? imageSource.type : 'image/jpeg';
    const objectPath = `group_avatars/${safeName}`;

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: safeName,
      type: mimeType,
    });

    const { error: uploadError } = await supabase.storage
      .from('luminus_assets')
      .upload(objectPath, formData);

    if (uploadError) {
      throw uploadError;
    }

    return objectPath;
  }, []);

  const openGroupMembers = () => {
    setIsMembersModalVisible(true);
  };

  const openGroupEditor = () => {
    setGroupNameDraft(groupData?.name ?? '');
    setGroupAvatarDraft(groupData?.avatar_url ?? groupData?.avatar ?? '');
    setIsEditGroupModalVisible(true);
  };

  const handlePickGroupAvatar = useCallback(async () => {
    if (!isCurrentUserAdmin) {
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      ThemedAlert.alert('Permission needed', 'Allow photo access to change the group avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    try {
      setIsSavingGroupDetails(true);
      const asset = result.assets[0];
      const uploadedPath = await uploadGroupAvatar({
        uri: asset.uri,
        name: asset.fileName || `group-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      setGroupAvatarDraft(uploadedPath);
    } catch (error) {
      console.error('[ChatDetails] Failed to upload group avatar:', error);
      ThemedAlert.alert('Upload failed', 'Unable to update the group avatar right now.');
    } finally {
      setIsSavingGroupDetails(false);
    }
  }, [isCurrentUserAdmin, uploadGroupAvatar]);

  const handleSaveGroupDetails = useCallback(async () => {
    if (!routeGroupId || !isCurrentUserAdmin) {
      return;
    }

    const nextName = groupNameDraft.trim() || groupData?.name || 'Group Chat';
    const nextAvatar = groupAvatarDraft || null;

    try {
      setIsSavingGroupDetails(true);

      const { data, error } = await supabase
        .from('group_chats')
        .update({ name: nextName, avatar_url: nextAvatar })
        .eq('id', routeGroupId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        applyFetchedGroup({
          ...data,
          members: groupData?.members ?? [],
        });
      }

      setIsEditGroupModalVisible(false);
      ThemedAlert.alert('Group Updated', 'The group name and avatar were saved.');
    } catch (error) {
      console.error('[ChatDetails] Failed to update group details:', error);
      ThemedAlert.alert('Update failed', 'Unable to update the group right now.');
    } finally {
      setIsSavingGroupDetails(false);
    }
  }, [applyFetchedGroup, groupAvatarDraft, groupData?.members, groupData?.name, groupNameDraft, isCurrentUserAdmin, routeGroupId]);

  const handleKickMember = useCallback((member) => {
    if (!isCurrentUserAdmin || !routeGroupId) {
      return;
    }

    const memberId = member?.alumniId ?? member?.id;
    if (!memberId || String(memberId) === String(currentUserId)) {
      return;
    }

    ThemedAlert.alert(
      'Remove member',
      `Remove ${member?.name ?? 'this member'} from the group chat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingMemberId(memberId);
              await removeGroupMember(routeGroupId, memberId);
              const fetchedGroup = await getGroupChat(routeGroupId).catch(() => null);
              if (fetchedGroup) {
                applyFetchedGroup(fetchedGroup);
              } else {
                setResolvedGroup((previous) => ({
                  ...(previous ?? {}),
                  members: (Array.isArray(previous?.members) ? previous.members : []).filter((item) => String(item?.alumni_id ?? item?.alumni?.id ?? item?.id) !== String(memberId)),
                }));
              }
              ThemedAlert.alert('Member removed', `${member?.name ?? 'The member'} was removed from the group.`);
            } catch (error) {
              console.error('[ChatDetails] Failed to remove member:', error);
              ThemedAlert.alert('Remove failed', 'Unable to remove this member right now.');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ]
    );
  }, [applyFetchedGroup, currentUserId, isCurrentUserAdmin, routeGroupId]);

  const groupAvatarUri = getAvatarUri(groupData?.name, groupAvatarDraft || groupData?.avatar_url || groupData?.avatar);
  const canManageGroup = isCurrentUserAdmin;

  useEffect(() => {
    if (!isAddMemberModalVisible) {
      setSearchQuery(''); // Clear search when the modal closes
      return;
    }

    loadCandidateMembers();
  }, [isAddMemberModalVisible, loadCandidateMembers]);

  const handleAddMember = async (member) => {
    if (!routeGroupId || !member?.id) {
      return;
    }

    try {
      setAddingMemberId(member.id);
      await addGroupMember(routeGroupId, member.id);

      const fetchedGroup = await getGroupChat(routeGroupId).catch(() => null);
      if (fetchedGroup) {
        applyFetchedGroup(fetchedGroup);
      }

      setCandidateMembers((previous) => previous.filter((item) => String(item?.id) !== String(member.id)));
      ThemedAlert.alert('Member Added', `${member.name} was added to the group chat.`);
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('duplicate') || message.includes('already')) {
        ThemedAlert.alert('Already a Member', 'This alumni is already in the group chat.');
      } else {
        ThemedAlert.alert('Add Failed', 'Unable to add member right now. Please try again.');
      }
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleLeaveGroup = () => {
    if (!routeGroupId) return;

    ThemedAlert.alert(
      'Leave Group',
      'Are you sure you want to leave this group chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = await getCurrentUser().catch(() => null);
              if (!currentUser?.id) return;

              // Remove the user's membership from the database
              const { error } = await supabase
                .from('group_chat_members')
                .delete()
                .eq('group_chat_id', routeGroupId)
                .eq('alumni_id', currentUser.id);

              if (error) throw error;

              ThemedAlert.alert('Left Group', 'You have left the group chat.');

              // Kick the user back to the chat list since they are no longer in the group
              navigation.goBack();
            } catch (e) {
              console.warn('[ChatDetails] Failed to leave group', e);
              ThemedAlert.alert('Error', 'Could not leave the group at this time.');
            }
          },
        },
      ]
    );
  };

  // --- DM ACTION HANDLERS ---
  const handleAudioCall = () => {
    ThemedAlert.alert('Coming Soon', 'Audio calling will be available in a future update.');
  };

  const handleVideoCall = () => {
    ThemedAlert.alert('Coming Soon', 'Video calling will be available in a future update.');
  };

  const updateDMSettings = async (updates) => {
    if (!dmProfileUserId) return false;

    try {
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return false;

      const { error } = await supabase
        .from('dm_settings')
        .upsert(
          { user_id: currentUser.id, contact_id: dmProfileUserId, ...updates },
          { onConflict: 'user_id, contact_id' }
        );

      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('[ChatDetails] Failed to update DM settings', e);
      return false;
    }
  };

  const submitReport = async (reason) => {
    try {
      const currentUser = await getCurrentUser().catch(() => null);
      if (currentUser?.id && dmProfileUserId) {
        // Best-effort insert. Will fail silently if user_reports table isn't created yet,
        // but still shows the success alert to the user for good UX.
        await supabase.from('user_reports').insert([{
          reporter_id: currentUser.id,
          reported_user_id: dmProfileUserId,
          reason,
        }]);
      }
    } catch (e) {
      console.warn('Report failed', e);
    } finally {
      ThemedAlert.alert('Report Submitted', 'Thank you. We have received your report and will review this account.');
    }
  };

  const handleMute = () => {
    ThemedAlert.alert('Mute messages', 'Are you sure you want to mute notifications from this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mute',
        onPress: async () => {
          const success = await updateDMSettings({ is_muted: true });
          if (success) ThemedAlert.alert('Muted', 'Notifications for this chat are now muted.');
        },
      },
    ]);
  };

  const handleBlock = () => {
    ThemedAlert.alert('Block User', 'Are you sure you want to block this user? You will no longer receive their messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          const success = await updateDMSettings({ is_blocked: true });
          if (success) {
            ThemedAlert.alert('Blocked', 'This user has been blocked.');
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleReport = () => {
    ThemedAlert.alert('Report User', 'Why are you reporting this user?', [
      { text: 'Spam or Scam', style: 'destructive', onPress: () => submitReport('Spam') },
      { text: 'Inappropriate Content', style: 'destructive', onPress: () => submitReport('Inappropriate') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Determine view type based on what was passed

  // Render DM view
  if (routeContact) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.dmContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.dmCenterHeader}>
              <Image 
                source={{ uri: getAvatarUri(routeContact?.name ?? routeContact?.first_name, routeContact?.avatar ?? routeContact?.alumni_photo) }} 
                style={styles.bigAvatar} 
              />
              <Text style={styles.dmName}>
                {routeContact?.name ?? (`${routeContact?.first_name ?? ''} ${routeContact?.last_name ?? ''}`.trim() || 'Alumni')}
              </Text>
              {routeContact?.username ? <Text style={styles.dmUsername}>@{routeContact.username}</Text> : null}

              <View style={styles.dmActionsRow}>
                <TouchableOpacity 
                  style={styles.dmActionButton} 
                  onPress={handleAudioCall}
                >
                  <Ionicons name="call-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.dmActionButton, styles.dmActionSecondary]} 
                  onPress={handleVideoCall}
                >
                  <Ionicons name="videocam-outline" size={22} color="#31429B" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dmActionButton, styles.dmActionSecondary]}
                  onPress={() => {
                    if (dmProfileUserId) {
                      navigation.navigate('Home', {
                        screen: 'ProfileView',
                        params: { userId: dmProfileUserId },
                      });
                    }
                  }}
                >
                  <Ionicons name="person-outline" size={22} color="#31429B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dmOptionsList}>
              <TouchableOpacity 
                style={styles.dmOptionRow} 
                onPress={() => navigation.navigate('SearchMessage', { contactId: routeContact?.id })}
              >
                <Ionicons name="search-outline" size={18} color="#31429B" />
                <Text style={styles.dmOptionText}>Search in conversation</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dmOptionRow} 
                onPress={handleMute}
              >
                <Ionicons name="notifications-outline" size={18} color="#31429B" />
                <Text style={styles.dmOptionText}>Mute messages</Text>
              </TouchableOpacity>

              <View style={styles.dmDivider} />

              <TouchableOpacity 
                style={[styles.dmOptionRow, styles.dmDestructive]} 
                onPress={handleBlock}
              >
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={[styles.dmOptionText, { color: '#DC2626' }]}>Block</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.dmOptionRow, styles.dmDestructive]} 
                onPress={handleReport}
              >
                <Ionicons name="flag-outline" size={18} color="#DC2626" />
                <Text style={[styles.dmOptionText, { color: '#DC2626' }]}>Report</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Image source={{ uri: groupAvatarUri }} style={styles.avatar} />
          <Text style={styles.name}>{groupData?.name || 'Group Chat'}</Text>
          {canManageGroup ? <Text style={styles.adminBadge}>Group admin</Text> : null}
          <View style={styles.groupActionsRow}>
            <TouchableOpacity
              style={[styles.groupActionButton, !canManageGroup ? styles.groupActionButtonMuted : null]}
              onPress={openGroupEditor}
              disabled={!canManageGroup}
            >
              <Ionicons name="create-outline" size={16} color={canManageGroup ? '#31429B' : '#9CA3AF'} />
              <Text style={[styles.groupActionButtonText, !canManageGroup ? styles.groupActionButtonTextMuted : null]}>Edit Group</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.groupActionButtonSecondary}
              onPress={openGroupMembers}
            >
              <Ionicons name="people-outline" size={16} color="#31429B" />
              <Text style={styles.groupActionButtonSecondaryText}>View Members</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.membersHeaderRow}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Members</Text>
          <View style={styles.membersHeaderActions}>
            <TouchableOpacity style={styles.viewMembersButton} activeOpacity={0.85} onPress={openGroupMembers}>
              <Ionicons name="list-outline" size={14} color="#31429B" />
              <Text style={styles.viewMembersButtonText}>Full List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addMemberButton} activeOpacity={0.85} onPress={() => setIsAddMemberModalVisible(true)}>
              <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
              <Text style={styles.addMemberButtonText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoadingMembers ? (
          <View style={styles.membersLoadingWrap}>
            <ActivityIndicator size="small" color="#31429B" />
          </View>
        ) : normalizedMembers.length > 0 ? (
          <FlatList
            data={normalizedMembers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            style={styles.membersList}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.emptyText}>No members found for this group chat.</Text>
        )}

        <Text style={styles.sectionTitle}>Shared Media</Text>
        <FlatList
          data={groupData?.media ?? []}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          renderItem={({ item }) => (
            <Image source={{ uri: item?.uri }} style={styles.mediaImage} />
          )}
          horizontal
        />

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
          <Ionicons name="exit-outline" size={18} color="#E57373" />
          <Text style={styles.leaveBtnText}>Leave Group</Text>
        </TouchableOpacity>

        <Modal
          visible={isEditGroupModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditGroupModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit Group</Text>
                <TouchableOpacity onPress={() => setIsEditGroupModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <View style={styles.editAvatarWrap}>
                <Image source={{ uri: groupAvatarDraft || groupAvatarUri }} style={styles.editAvatar} />
                <TouchableOpacity
                  style={[styles.avatarEditButton, !canManageGroup || isSavingGroupDetails ? styles.groupActionButtonMuted : null]}
                  onPress={handlePickGroupAvatar}
                  disabled={!canManageGroup || isSavingGroupDetails}
                >
                  <Ionicons name="image-outline" size={16} color={canManageGroup ? '#31429B' : '#9CA3AF'} />
                  <Text style={[styles.avatarEditButtonText, !canManageGroup ? styles.groupActionButtonTextMuted : null]}>Change Avatar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editLabel}>Group name</Text>
              <TextInput
                style={styles.editInput}
                value={groupNameDraft}
                onChangeText={setGroupNameDraft}
                placeholder="Group name"
                placeholderTextColor="#9CA3AF"
                maxLength={60}
              />

              <TouchableOpacity
                style={[styles.saveGroupButton, isSavingGroupDetails ? styles.saveGroupButtonDisabled : null]}
                onPress={handleSaveGroupDetails}
                disabled={isSavingGroupDetails}
              >
                {isSavingGroupDetails ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveGroupButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isMembersModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsMembersModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>All Members</Text>
                <TouchableOpacity onPress={() => setIsMembersModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubTitle}>{normalizedMembers.length} people in this group</Text>

              <FlatList
                data={normalizedMembers}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.memberManageRow}>
                    <View style={styles.memberManageInfo}>
                      <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                      <View style={styles.memberMetaWrap}>
                        <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.memberRoleText}>{String(item.role).toLowerCase() === 'admin' ? 'Admin' : 'Member'}</Text>
                      </View>
                    </View>

                    {canManageGroup && String(item.alumniId) !== String(currentUserId) ? (
                      <TouchableOpacity
                        style={[styles.kickButton, removingMemberId === item.alumniId ? styles.kickButtonDisabled : null]}
                        disabled={removingMemberId === item.alumniId}
                        onPress={() => handleKickMember(item)}
                      >
                        {removingMemberId === item.alumniId ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <>
                            <Ionicons name="remove-circle-outline" size={14} color="#DC2626" />
                            <Text style={styles.kickButtonText}>Kick</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>No members found for this group.</Text>}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={isAddMemberModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAddMemberModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Add Group Member</Text>
                <TouchableOpacity onPress={() => setIsAddMemberModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#1F2937" />
                </TouchableOpacity>
              </View>

              {/* --- SEARCH BAR --- */}
              <View style={styles.modalSearchBox}>
                <Ionicons name="search-outline" size={16} color="#6B7280" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search connections..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
              </View>

              {isLoadingCandidates ? (
                <View style={styles.modalLoadingWrap}>
                  <ActivityIndicator size="small" color="#31429B" />
                </View>
              ) : filteredCandidates.length === 0 ? (
                <Text style={styles.modalEmptyText}>
                  {searchQuery ? 'No matching connections found.' : 'No available connections to add.'}
                </Text>
              ) : (
                <FlatList
                  data={filteredCandidates}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <View style={styles.candidateRow}>
                      <View style={styles.candidateInfo}>
                        <Image source={{ uri: item.avatar }} style={styles.candidateAvatar} />
                        <Text style={styles.candidateName} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.candidateAddButton, addingMemberId === item.id ? styles.candidateAddButtonDisabled : null]}
                        disabled={addingMemberId === item.id}
                        onPress={() => handleAddMember(item)}
                      >
                        {addingMemberId === item.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.candidateAddButtonText}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  style={styles.candidateList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff', padding: Math.max(14, Math.min(20, SCREEN_WIDTH * 0.04)) },
  header: { alignItems: 'center', marginBottom: Math.max(14, Math.min(22, SCREEN_HEIGHT * 0.024)) },
  backButton: { position: 'absolute', left: 0, top: 0, zIndex: 2, padding: 4 },
  avatar: { width: Math.max(64, Math.min(84, SCREEN_WIDTH * 0.18)), height: Math.max(64, Math.min(84, SCREEN_WIDTH * 0.18)), borderRadius: Math.max(32, Math.min(42, SCREEN_WIDTH * 0.09)), marginBottom: 8 },
  name: { fontWeight: 'bold', fontSize: Math.max(18, Math.min(22, SCREEN_WIDTH * 0.05)), color: '#222' },
  adminBadge: { marginTop: 6, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#EEF2FF', color: '#31429B', fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  groupActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  groupActionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  groupActionButtonSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#D8E0FF', backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  groupActionButtonMuted: { opacity: 0.6 },
  groupActionButtonText: { color: '#31429B', fontSize: 12, fontWeight: '700' },
  groupActionButtonTextMuted: { color: '#9CA3AF' },
  groupActionButtonSecondaryText: { color: '#31429B', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontWeight: 'bold', color: '#31429B', marginTop: 16, marginBottom: 6, fontSize: Math.max(14, Math.min(16, SCREEN_WIDTH * 0.04)) },
  membersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  membersHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewMembersButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  viewMembersButtonText: { color: '#31429B', marginLeft: 6, fontSize: 12, fontWeight: '700' },
  addMemberButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#31429B', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  addMemberButtonText: { color: '#FFFFFF', marginLeft: 6, fontSize: 12, fontWeight: '700' },
  membersList: { marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  memberAvatar: { width: Math.max(36, Math.min(44, SCREEN_WIDTH * 0.1)), height: Math.max(36, Math.min(44, SCREEN_WIDTH * 0.1)), borderRadius: Math.max(18, Math.min(22, SCREEN_WIDTH * 0.05)) },
  memberName: { fontSize: Math.max(12, Math.min(14, SCREEN_WIDTH * 0.034)), color: '#222', marginLeft: 10, flexShrink: 1 },
  membersLoadingWrap: { height: 48, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  mediaImage: { width: Math.max(56, Math.min(80, SCREEN_WIDTH * 0.18)), height: Math.max(56, Math.min(80, SCREEN_WIDTH * 0.18)), borderRadius: 8, marginRight: 8 },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 32, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  leaveBtnText: { color: '#E57373', fontWeight: 'bold', marginLeft: 6, fontSize: Math.max(14, Math.min(16, SCREEN_WIDTH * 0.036)) },
  /* DM / Instagram-like styles */
  headerTopRow: { height: 44, justifyContent: 'center' },
  dmContainer: { flexGrow: 1 },
  dmCenterHeader: { alignItems: 'center', marginTop: 12, marginBottom: 20, paddingVertical: 12 },
  bigAvatar: { width: Math.max(120, Math.min(160, SCREEN_WIDTH * 0.36)), height: Math.max(120, Math.min(160, SCREEN_WIDTH * 0.36)), borderRadius: Math.max(60, Math.min(80, SCREEN_WIDTH * 0.18)), marginBottom: 12 },
  dmName: { fontWeight: '800', fontSize: Math.max(18, Math.min(22, SCREEN_WIDTH * 0.06)), color: '#1F2937' },
  dmUsername: { color: '#6B7280', marginTop: 4, fontSize: 14 },
  dmActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  dmActionButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#31429B', alignItems: 'center', justifyContent: 'center' },
  dmActionSecondary: { backgroundColor: '#EEF2FF' },
  dmOptionsList: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 0 },
  dmOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dmOptionText: { marginLeft: 12, fontSize: 15, color: '#1F2937', fontWeight: '500' },
  dmDivider: { height: 8, backgroundColor: '#F9FAFB', marginVertical: 4 },
  dmDestructive: { borderBottomColor: '#FEE2E2' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 14, maxHeight: SCREEN_HEIGHT * 0.65, padding: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  modalSubTitle: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1F2937', padding: 0 },
  modalLoadingWrap: { paddingVertical: 24, alignItems: 'center' },
  modalEmptyText: { fontSize: 13, color: '#6B7280', paddingVertical: 12 },
  candidateList: { maxHeight: SCREEN_HEIGHT * 0.48 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  candidateInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  candidateAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  candidateName: { fontSize: 14, color: '#1F2937', fontWeight: '500', flexShrink: 1 },
  candidateAddButton: { backgroundColor: '#31429B', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, minWidth: 58, alignItems: 'center' },
  candidateAddButtonDisabled: { opacity: 0.7 },
  candidateAddButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  editAvatarWrap: { alignItems: 'center', marginBottom: 12 },
  editAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB', marginBottom: 10 },
  avatarEditButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#D8E0FF', backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  avatarEditButtonText: { color: '#31429B', fontSize: 12, fontWeight: '700' },
  editLabel: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  editInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1F2937', marginBottom: 14 },
  saveGroupButton: { backgroundColor: '#31429B', borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  saveGroupButtonDisabled: { opacity: 0.75 },
  saveGroupButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  memberManageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  memberManageInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  memberMetaWrap: { marginLeft: 10, flex: 1, minWidth: 0 },
  memberRoleText: { marginTop: 2, fontSize: 12, color: '#6B7280' },
  kickButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF1F2' },
  kickButtonDisabled: { opacity: 0.7 },
  kickButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
});

export default ChatDetailsScreen;

