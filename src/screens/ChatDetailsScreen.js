import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, View, Text, Image, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAvatarUri } from '../utils/imageUtils';
import { addGroupMember, getGroupChat } from '../services/messageQueries';
import { getCurrentUser } from '../services/supabaseAuth';
import { getFollowers, getFollowing } from '../services/connectionQueries';
import { ThemedAlert } from '../components/ThemedAlert';

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
        name: fullName,
        avatar: getAvatarUri(fullName, avatar),
      };
    });
  }, [groupData?.members]);

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

  useEffect(() => {
    if (!isAddMemberModalVisible) {
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
                  onPress={() => { /* TODO: audio call */ }}
                >
                  <Ionicons name="call-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.dmActionButton, styles.dmActionSecondary]} 
                  onPress={() => { /* TODO: video call */ }}
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
                onPress={() => { /* TODO: toggle notifications */ }}
              >
                <Ionicons name="notifications-outline" size={18} color="#31429B" />
                <Text style={styles.dmOptionText}>Mute messages</Text>
              </TouchableOpacity>

              <View style={styles.dmDivider} />

              <TouchableOpacity 
                style={[styles.dmOptionRow, styles.dmDestructive]} 
                onPress={() => { /* TODO: block */ }}
              >
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={[styles.dmOptionText, { color: '#DC2626' }]}>Block</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.dmOptionRow, styles.dmDestructive]} 
                onPress={() => { /* TODO: report */ }}
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
          <Image source={{ uri: getAvatarUri(groupData?.name, groupData?.avatar) }} style={styles.avatar} />
          <Text style={styles.name}>{groupData?.name || 'Group Chat'}</Text>
        </View>

        <View style={styles.membersHeaderRow}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Members</Text>
          <TouchableOpacity style={styles.addMemberButton} activeOpacity={0.85} onPress={() => setIsAddMemberModalVisible(true)}>
            <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
            <Text style={styles.addMemberButtonText}>Add Member</Text>
          </TouchableOpacity>
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

        <TouchableOpacity style={styles.leaveBtn}>
          <Ionicons name="exit-outline" size={18} color="#E57373" />
          <Text style={styles.leaveBtnText}>Leave Group</Text>
        </TouchableOpacity>

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
                  <Ionicons name="close" size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              {isLoadingCandidates ? (
                <View style={styles.modalLoadingWrap}>
                  <ActivityIndicator size="small" color="#31429B" />
                </View>
              ) : candidateMembers.length === 0 ? (
                <Text style={styles.modalEmptyText}>No available connections to add.</Text>
              ) : (
                <FlatList
                  data={candidateMembers}
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
  sectionTitle: { fontWeight: 'bold', color: '#31429B', marginTop: 16, marginBottom: 6, fontSize: Math.max(14, Math.min(16, SCREEN_WIDTH * 0.04)) },
  membersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
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
  dmName: { fontWeight: '800', fontSize: Math.max(18, Math.min(22, SCREEN_WIDTH * 0.06)), color: '#111827' },
  dmUsername: { color: '#6B7280', marginTop: 4, fontSize: 14 },
  dmActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  dmActionButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#31429B', alignItems: 'center', justifyContent: 'center' },
  dmActionSecondary: { backgroundColor: '#EEF2FF' },
  dmOptionsList: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 0 },
  dmOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dmOptionText: { marginLeft: 12, fontSize: 15, color: '#111827', fontWeight: '500' },
  dmDivider: { height: 8, backgroundColor: '#F9FAFB', marginVertical: 4 },
  dmDestructive: { borderBottomColor: '#FEE2E2' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 14, maxHeight: SCREEN_HEIGHT * 0.65, padding: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalLoadingWrap: { paddingVertical: 24, alignItems: 'center' },
  modalEmptyText: { fontSize: 13, color: '#6B7280', paddingVertical: 12 },
  candidateList: { maxHeight: SCREEN_HEIGHT * 0.48 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  candidateInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  candidateAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  candidateName: { fontSize: 14, color: '#111827', fontWeight: '500', flexShrink: 1 },
  candidateAddButton: { backgroundColor: '#31429B', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, minWidth: 58, alignItems: 'center' },
  candidateAddButtonDisabled: { opacity: 0.7 },
  candidateAddButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});

export default ChatDetailsScreen;
