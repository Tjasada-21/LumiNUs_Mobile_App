import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/supabaseAuth';
import { getFollowing } from '../services/connectionQueries';
import { createGroupChat } from '../services/messageQueries';
import BrandHeader from '../components/BrandHeader';
import SmartTextInput from '../components/SmartTextInput';
import styles from '../styles/NewMessageScreen.styles';
import { getAvatarUri } from '../utils/imageUtils';
// authStorage no longer used; Supabase auth is used

const NewMessageScreen = ({ navigation }) => {
	// SECTION: Layout values
	const { width } = useWindowDimensions();
	const isCompactWidth = width < 375;
	const horizontalPadding = isCompactWidth ? 14 : 16;
	const avatarSize = isCompactWidth ? 40 : 42;

	const [query, setQuery] = useState('');
	const [groupModalVisible, setGroupModalVisible] = useState(false);
	const [groupName, setGroupName] = useState('');
	const [memberQuery, setMemberQuery] = useState('');
	const [selectedMembers, setSelectedMembers] = useState([]);
	const [connections, setConnections] = useState([]);
	const [connectionsLoading, setConnectionsLoading] = useState(false);
	const [connectionsError, setConnectionsError] = useState('');

	const getConnectionName = (connection) => {
		return `${connection?.first_name ?? ''} ${connection?.last_name ?? ''}`.trim() || 'Alumni';
	};

	const getConnectionAvatar = (connection) => {
		const connectionName = getConnectionName(connection);

		return getAvatarUri(connectionName, connection?.alumni_photo);
	};

	// DERIVED VALUE: Filtered people list
	const filteredPeople = useMemo(() => {
		return [];
	}, []);

	// DERIVED VALUE: Filtered members for the group modal
	const filteredMembers = useMemo(() => {
		const normalizedQuery = memberQuery.trim().toLowerCase();

		if (!normalizedQuery) {
			return connections;
		}

		return connections.filter((connection) => {
			const connectionName = getConnectionName(connection).toLowerCase();
			return connectionName.includes(normalizedQuery);
		});
	}, [connections, memberQuery]);

	// DERIVED VALUE: Filtered connections list
	const filteredConnections = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return connections;
		}

		return connections.filter((connection) => {
			const connectionName = `${connection?.first_name ?? ''} ${connection?.last_name ?? ''}`.trim().toLowerCase();
			return connectionName.includes(normalizedQuery);
		});
	}, [connections, query]);

	// DERIVED VALUE: Selected member display names
	const selectedMemberNames = useMemo(() => selectedMembers.map((person) => getConnectionName(person)), [selectedMembers]);

	useEffect(() => {
		let isMounted = true;

		const fetchConnections = async () => {
			try {
				setConnectionsLoading(true);
				setConnectionsError('');

				const supaUser = await getCurrentUser();
				if (!supaUser) {
					if (isMounted) setConnectionsError('No active session found.');
					return;
				}

				const following = await getFollowing(supaUser.id).catch(() => []);
				if (!isMounted) return;
				setConnections(Array.isArray(following) ? following.map((f) => f.followed ?? f) : []);
			} catch (fetchError) {
				console.error('Failed to fetch connections:', fetchError);
				if (isMounted) {
					setConnectionsError('Unable to load connections right now.');
				}
			} finally {
				if (isMounted) {
					setConnectionsLoading(false);
				}
			}
		};

		fetchConnections();

		return () => {
			isMounted = false;
		};
	}, []);

	// HANDLER: Open the group chat modal
	const openGroupChatModal = () => {
		setGroupModalVisible(true);
	};

	// HANDLER: Close the group chat modal
	const closeGroupChatModal = () => {
		setGroupModalVisible(false);
		setGroupName('');
		setMemberQuery('');
	};

	// HANDLER: Toggle a member in the group chat list
	const toggleMemberSelection = (member) => {
		setSelectedMembers((currentMembers) => {
			const exists = currentMembers.some((item) => item.id === member.id);

			if (exists) {
				return currentMembers.filter((item) => item.id !== member.id);
			}

			return [...currentMembers, member];
		});
	};

	// HANDLER: Create the group chat from selected members
	const handleCreateGroupChat = async () => {
		if (!groupName.trim() || selectedMembers.length < 2) {
			// Optionally show error: group name required, at least 2 members
			return;
		}
		try {
			const supaUser = await getCurrentUser();
			if (!supaUser) return;
			const memberIds = selectedMembers.map((m) => m.id);
			const group = await createGroupChat(supaUser.id, groupName.trim(), memberIds);
			closeGroupChatModal();
			const normalizedSelectedMembers = selectedMembers.map((member) => ({
				id: member?.id,
				name: getConnectionName(member),
				alumni_photo: member?.alumni_photo,
			}));
			// Navigate to ConvoScreen with group chat info
			navigation.navigate('ConvoScreen', {
				groupId: group.id,
				groupName: group.name,
				groupAvatar: group.avatar || null,
				groupMembers: group.members || normalizedSelectedMembers,
			});
		} catch (error) {
			// Optionally show error
			closeGroupChatModal();
		}
	};

	// RENDER HELPER: Connection row
	const renderConnectionRow = (connection) => {
		const connectionName = getConnectionName(connection);
		const connectionAvatar = getConnectionAvatar(connection);

		return (
			<Pressable key={String(connection?.connection_id ?? connection?.id)} style={styles.connectionRow} onPress={() => {}} android_ripple={{ color: '#F1F5F9' }}>
				<Image source={{ uri: connectionAvatar }} style={styles.connectionAvatar} />
				<View style={styles.connectionTextWrap}>
					<Text style={styles.connectionName} numberOfLines={1}>
						{connectionName}
					</Text>
					<Text style={styles.connectionMeta}>Connected</Text>
				</View>
				<Ionicons name="chevron-forward" size={18} color="#8A94A6" />
			</Pressable>
		);
	};

	// RENDER HELPER: Group member row
	const renderMemberRow = ({ item }) => {
		const isSelected = selectedMembers.some((member) => member.id === item.id);
		const memberName = getConnectionName(item);
		const memberAvatar = getConnectionAvatar(item);

		return (
			<Pressable
				style={styles.memberRow}
				onPress={() => toggleMemberSelection(item)}
				android_ripple={{ color: '#F1F5F9' }}
			>
				<Image
					source={{ uri: memberAvatar }}
					style={[styles.memberAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
				/>
				<View style={styles.memberTextWrap}>
					<Text style={styles.memberName} numberOfLines={1}>
						{memberName}
					</Text>
					<Text style={styles.memberMeta}>{isSelected ? 'Selected' : 'Tap to add to the group'}</Text>
				</View>
				<View style={[styles.memberCheckCircle, isSelected && styles.memberCheckCircleSelected]}>
					{isSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
				</View>
			</Pressable>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />
				{/* SECTION: Message composer */}
				<FlatList
					data={filteredPeople}
					renderItem={() => null}
					keyExtractor={(item, index) => String(index)}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={(
						<View>
							<View style={styles.headerRow}>
								<Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
									<Ionicons name="arrow-back" size={24} color="#4A4A4A" />
								</Pressable>
								<Text style={styles.title}>New message</Text>
							</View>

							<View style={styles.searchWrap}>
								<TextInput
									value={query}
									onChangeText={setQuery}
									placeholder="Type a name or group"
									placeholderTextColor="#6D6D6D"
									style={styles.searchInput}
								/>
							</View>

							<View style={styles.actionsRow}>
								<Pressable style={styles.groupChatButton} onPress={openGroupChatModal} android_ripple={{ color: '#EAF0FF' }}>
									<Ionicons name="people-outline" size={18} color="#31429B" />
									<Text style={styles.groupChatButtonText}>Create group chat</Text>
								</Pressable>

								<Pressable style={styles.notesButton} onPress={() => {}} android_ripple={{ color: '#EAF0FF' }}>
									<Ionicons name="document-text-outline" size={18} color="#31429B" />
									<Text style={styles.notesButtonText}>Add notes</Text>
								</Pressable>
							</View>

							<View style={styles.connectionsSection}>
								<View style={styles.sectionHeaderRow}>
									<Text style={styles.sectionLabel}>Connections</Text>
									<Text style={styles.sectionCount}>{connections.length}</Text>
								</View>

								{connectionsLoading ? (
									<View style={styles.connectionsLoadingWrap}>
										<ActivityIndicator color="#31429B" />
									</View>
								) : connectionsError ? (
									<View style={styles.connectionsEmptyWrap}>
										<Text style={styles.emptyText}>{connectionsError}</Text>
									</View>
								) : filteredConnections.length > 0 ? (
									<View style={styles.connectionsList}>
										{filteredConnections.map(renderConnectionRow)}
									</View>
								) : (
									<View style={styles.connectionsEmptyWrap}>
										<Text style={styles.emptyText}>No connections found.</Text>
									</View>
								)}
							</View>
						</View>
					)}
					ListEmptyComponent={(
						<View style={styles.emptyWrap}>
							<Text style={styles.emptyText}>No matching names or groups found.</Text>
						</View>
					)}
					contentContainerStyle={[
						styles.content,
						styles.resultsList,
						{ paddingHorizontal: horizontalPadding, paddingBottom: 24 },
					]}
				/>

				<Modal transparent visible={groupModalVisible} animationType="fade" onRequestClose={closeGroupChatModal}>
					<View style={styles.modalOverlay}>
						<Pressable style={styles.modalBackdrop} onPress={closeGroupChatModal} />
						<View style={styles.modalCard}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Add members</Text>
								<Pressable style={styles.modalCloseButton} onPress={closeGroupChatModal} hitSlop={8}>
									<Ionicons name="close" size={22} color="#31429B" />
								</Pressable>
							</View>

							<Text style={styles.modalSubtitle}>Choose people to include in the group chat.</Text>

							<Text style={styles.modalFieldLabel}>Group chat name</Text>
							<SmartTextInput
								value={groupName}
								onChangeText={setGroupName}
								placeholder="Enter a group chat name"
								placeholderTextColor="#7A7A7A"
								style={styles.modalNameInput}
							/>

							<View style={styles.modalSearchWrap}>
								<Ionicons name="search-outline" size={18} color="#7A7A7A" />
								<TextInput
									value={memberQuery}
									onChangeText={setMemberQuery}
									placeholder="Search members"
									placeholderTextColor="#7A7A7A"
									style={styles.modalSearchInput}
								/>
							</View>

							{selectedMemberNames.length > 0 ? (
								<View style={styles.selectedWrap}>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedChipsRow}>
										{selectedMembers.map((member) => (
											<View key={String(member?.id)} style={styles.selectedChip}>
												<Text style={styles.selectedChipText}>{getConnectionName(member)}</Text>
											</View>
										))}
									</ScrollView>
								</View>
							) : null}

							<FlatList
								data={filteredMembers}
								renderItem={renderMemberRow}
								keyExtractor={(item) => String(item.id)}
								showsVerticalScrollIndicator={false}
								contentContainerStyle={styles.modalList}
								ListEmptyComponent={(
									<View style={styles.emptyWrap}>
										<Text style={styles.emptyText}>No matching connections found.</Text>
									</View>
								)}
							/>

							<View style={styles.modalActionsRow}>
								<Pressable style={styles.modalSecondaryButton} onPress={closeGroupChatModal} android_ripple={{ color: '#EAF0FF' }}>
									<Text style={styles.modalSecondaryButtonText}>Cancel</Text>
								</Pressable>
								<Pressable style={styles.modalPrimaryButton} onPress={handleCreateGroupChat} android_ripple={{ color: '#24346F' }}>
									<Text style={styles.modalPrimaryButtonText}>Create Group</Text>
								</Pressable>
							</View>
						</View>
					</View>
				</Modal>
			</View>
		</SafeAreaView>
	);
};

export default NewMessageScreen;
