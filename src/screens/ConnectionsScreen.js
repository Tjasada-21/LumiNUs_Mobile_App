import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
  getSentPendingRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  sendFollowRequest,
} from "../services/connectionQueries";
import { getAllAlumni, getAlumniByEmail } from "../services/alumniQueries";
import styles from "../styles/ConnectionsScreen.styles";
import { getAvatarUri } from "../utils/imageUtils";

const ConnectionsScreen = ({ navigation }) => {
  const [connections, setConnections] = useState([]);
  const [allAlumni, setAllAlumni] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [currentAlumniId, setCurrentAlumniId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  
  // Tab State: 'connections', 'approval', 'pending'
  const [activeTab, setActiveTab] = useState("connections");

  useFocusEffect(
    useCallback(() => {
      setRefreshTick((prev) => prev + 1);
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    const fetchConnections = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const user = await getCurrentUser();
        if (!user?.id && !user?.email) {
          setErrorMessage("No active session found.");
          return;
        }

        const alumniId = user?.id ?? null;
        const alumni = alumniId
          ? { id: alumniId }
          : await getAlumniByEmail(user.email).catch(() => null);
        if (!alumni?.id) {
          setErrorMessage("Unable to resolve alumni profile.");
          return;
        }

        setCurrentAlumniId(alumni.id);

        const [
          followingRows,
          followerRows,
          allAlumniRows,
          incomingRows,
          outgoingRows,
        ] = await Promise.all([
          getFollowing(alumni.id).catch((err) => {
            console.error("Failed to fetch following:", err);
            return [];
          }),
          getFollowers(alumni.id).catch((err) => {
            console.error("Failed to fetch followers:", err);
            return [];
          }),
          getAllAlumni(500).catch((err) => {
            console.error("Failed to fetch alumni suggestions:", err);
            return [];
          }),
          getPendingFollowRequests(alumni.id).catch((err) => {
            console.error("Failed to fetch connection requests:", err);
            return [];
          }),
          getSentPendingRequests(alumni.id).catch((err) => {
            console.error("Failed to fetch sent pending requests:", err);
            return [];
          }),
        ]);

        const normalizedFollowing = (followingRows || [])
          .map((row) => ({
            ...(row?.followed || {}),
            connection_id: row?.id,
          }))
          .filter((row) => Boolean(row?.id));

        const normalizedFollowers = (followerRows || [])
          .map((row) => ({
            ...(row?.follower || {}),
            connection_id: row?.id,
          }))
          .filter((row) => Boolean(row?.id));

        const dedupedConnections = Array.from(
          new Map(
            [...normalizedFollowing, ...normalizedFollowers].map((row) => [
              row.id,
              row,
            ])
          ).values()
        );

        if (!isMounted) return;
        setConnections(dedupedConnections);
        setAllAlumni(Array.isArray(allAlumniRows) ? allAlumniRows : []);
        setConnectionRequests(Array.isArray(incomingRows) ? incomingRows : []);
        setPendingOutgoing(Array.isArray(outgoingRows) ? outgoingRows : []);
      } catch (fetchError) {
        console.error("Failed to fetch connections:", fetchError);
        if (isMounted) {
          setErrorMessage("Unable to load connections right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchConnections();

    return () => {
      isMounted = false;
    };
  }, [refreshTick]);

  const openProfile = (userId) => {
    navigation.navigate("ProfileView", { userId });
  };

  const openMessage = (contact) => {
    navigation.navigate("ConvoScreen", {
      contactId: contact.id,
      contactName: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Alumni",
      contactAvatar: getAvatarUri(`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(), contact.alumni_photo),
    });
  };

  const handleAccept = async (row) => {
    try {
      await acceptFollowRequest(row.follower_alumni_id, row.followed_alumni_id);
      setConnectionRequests((prev) => prev.filter((r) => r.id !== row.id));
      const newConnection = row.follower
        ? { ...row.follower, connection_id: row.id }
        : null;
      if (newConnection?.id) {
        setConnections((prev) => {
          if (prev.some((c) => c.id === newConnection.id)) return prev;
          return [...prev, newConnection];
        });
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleDecline = async (row) => {
    try {
      await rejectFollowRequest(row.follower_alumni_id, row.followed_alumni_id);
      setConnectionRequests((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error("Failed to decline request:", err);
    }
  };

  const visibleConnections = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return connections;
    return connections.filter((contact) => {
      const fullName = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.toLowerCase();
      const program = String(contact.program ?? "").toLowerCase();
      return fullName.includes(normalizedQuery) || program.includes(normalizedQuery);
    });
  }, [connections, searchQuery]);

  const visibleApprovals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return connectionRequests;
    return connectionRequests.filter((row) => {
      const fullName = `${row.follower?.first_name ?? ""} ${row.follower?.last_name ?? ""}`.toLowerCase();
      return fullName.includes(normalizedQuery);
    });
  }, [connectionRequests, searchQuery]);

  const visiblePending = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return pendingOutgoing;
    return pendingOutgoing.filter((row) => {
      const fullName = `${row.followed?.first_name ?? ""} ${row.followed?.last_name ?? ""}`.toLowerCase();
      return fullName.includes(normalizedQuery);
    });
  }, [pendingOutgoing, searchQuery]);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("HomeTab");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        
        {/* WHITE HEADER */}
        <View style={styles.whiteHeaderCard}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={goBack} hitSlop={10}>
              <Ionicons name="arrow-back" size={26} color="#31429B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Profile</Text>
          </View>
          <TouchableOpacity 
            style={styles.smallAddButton}
            onPress={() => navigation.navigate("GlobalSearch")}
          >
            <Ionicons name="person-add" size={16} color="#FFD404" />
            <Text style={styles.smallAddText}>Add Connections</Text>
          </TouchableOpacity>
        </View>

        {/* MIDDLE BLUE SECTION */}
        <View style={styles.middleBlueSection}>
          {/* COMPACT TABS */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === "connections" && styles.activeTabButton]}
              onPress={() => setActiveTab("connections")}
            >
              <Text style={[styles.tabText, activeTab === "connections" && styles.activeTabText]}>
                Your Connections
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === "approval" && styles.activeTabButton]}
              onPress={() => setActiveTab("approval")}
            >
              <Text style={[styles.tabText, activeTab === "approval" && styles.activeTabText]}>
                For Approval
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === "pending" && styles.activeTabButton]}
              onPress={() => setActiveTab("pending")}
            >
              <Text style={[styles.tabText, activeTab === "pending" && styles.activeTabText]}>
                Pending
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* WHITE BOTTOM SHEET */}
        <View style={styles.whiteBottomSheet}>
          {loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color="#31429B" />
            </View>
          ) : errorMessage ? (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              
              {/* YOUR CONNECTIONS TAB */}
              {activeTab === "connections" && (
                visibleConnections.length === 0 ? (
                  <View style={styles.centerWrap}>
                    <Text style={styles.emptyText}>No connections found.</Text>
                  </View>
                ) : (
                  visibleConnections.map((contact) => {
                    const contactName = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Alumni";
                    const contactAvatar = getAvatarUri(contactName, contact.alumni_photo);
                    const gradYear = contact.year_graduated ? String(contact.year_graduated).match(/\d{4}/)?.[0] : "XXXX";

                    return (
                      <View key={`conn-${contact.id}`} style={styles.listItem}>
                        <TouchableOpacity style={styles.listInfoArea} onPress={() => openProfile(contact.id)}>
                          <Image source={{ uri: contactAvatar }} style={styles.avatar} />
                          <View style={styles.textWrap}>
                            <Text style={styles.nameText} numberOfLines={1}>{contactName}</Text>
                            <Text style={styles.metaText} numberOfLines={1}>Class of {gradYear} | {contact.program || "Alumni"}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.messageButton} onPress={() => openMessage(contact)}>
                          <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )
              )}

              {/* FOR APPROVAL TAB */}
              {activeTab === "approval" && (
                visibleApprovals.length === 0 ? (
                  <View style={styles.centerWrap}>
                    <Text style={styles.emptyText}>No pending requests to approve.</Text>
                  </View>
                ) : (
                  visibleApprovals.map((row) => {
                    const requester = row.follower || {};
                    const requesterName = `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() || "Alumni";
                    const requesterAvatar = getAvatarUri(requesterName, requester.alumni_photo);
                    const gradYear = requester.year_graduated ? String(requester.year_graduated).match(/\d{4}/)?.[0] : "XXXX";

                    return (
                      <View key={`req-${row.id}`} style={styles.listItem}>
                        <TouchableOpacity style={styles.listInfoArea} onPress={() => openProfile(requester.id)}>
                          <Image source={{ uri: requesterAvatar }} style={styles.avatar} />
                          <View style={styles.textWrap}>
                            <Text style={styles.nameText} numberOfLines={1}>{requesterName}</Text>
                            <Text style={styles.metaText} numberOfLines={1}>Class of {gradYear} | {requester.program || "Alumni"}</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.actionRow}>
                          <TouchableOpacity style={[styles.messageButton, { marginRight: 6 }]} onPress={() => handleAccept(row)}>
                            <Text style={styles.messageButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.messageButton, styles.declineButton]} onPress={() => handleDecline(row)}>
                            <Text style={[styles.messageButtonText, styles.declineButtonText]}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )
              )}

              {/* PENDING TAB */}
              {activeTab === "pending" && (
                visiblePending.length === 0 ? (
                  <View style={styles.centerWrap}>
                    <Text style={styles.emptyText}>No outgoing requests pending.</Text>
                  </View>
                ) : (
                  visiblePending.map((row) => {
                    const target = row.followed || {};
                    const targetName = `${target.first_name ?? ""} ${target.last_name ?? ""}`.trim() || "Alumni";
                    const targetAvatar = getAvatarUri(targetName, target.alumni_photo);
                    const gradYear = target.year_graduated ? String(target.year_graduated).match(/\d{4}/)?.[0] : "XXXX";

                    return (
                      <View key={`pend-${row.id}`} style={styles.listItem}>
                        <TouchableOpacity style={styles.listInfoArea} onPress={() => openProfile(target.id)}>
                          <Image source={{ uri: targetAvatar }} style={styles.avatar} />
                          <View style={styles.textWrap}>
                            <Text style={styles.nameText} numberOfLines={1}>{targetName}</Text>
                            <Text style={styles.metaText} numberOfLines={1}>Class of {gradYear} | {target.program || "Alumni"}</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={[styles.messageButton, styles.disabledButton]}>
                          <Text style={[styles.messageButtonText, styles.disabledButtonText]}>Pending</Text>
                        </View>
                      </View>
                    );
                  })
                )
              )}

            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ConnectionsScreen;