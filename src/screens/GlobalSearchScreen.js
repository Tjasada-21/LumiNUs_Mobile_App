import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/GlobalSearchScreen.styles";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getFollowers,
  getFollowing,
  getSentPendingRequests,
  sendFollowRequest,
} from "../services/connectionQueries";
import { getAllAlumni, getAlumniByEmail } from "../services/alumniQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { ThemedAlert } from "../components/ThemedAlert";

const GlobalSearchScreen = ({ navigation, route }) => {
  const initialQuery = route?.params?.query ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentAlumni, setCurrentAlumni] = useState(null);
  const [allAlumni, setAllAlumni] = useState([]);
  const [connectedIds, setConnectedIds] = useState(new Set());
  const [pendingOutgoingIds, setPendingOutgoingIds] = useState(new Set());
  const [sendingIds, setSendingIds] = useState(new Set());

  // Controls whether a section shows all items or just the first 4
  const [expandedSections, setExpandedSections] = useState({
    batch: false,
    program: false,
    others: false,
  });

  const loadSearchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const user = await getCurrentUser();
      if (!user?.id && !user?.email) {
        setErrorMessage("No active session found.");
        return;
      }

      const alumni = user?.id
        ? { id: user.id, email: user.email }
        : await getAlumniByEmail(user.email).catch(() => null);

      if (!alumni?.id) {
        setErrorMessage("Unable to resolve your alumni profile.");
        return;
      }

      // Fetch the full alumni profile to get year and program for matching
      const fullCurrentAlumni = await getAlumniByEmail(alumni.email).catch(() => alumni);
      setCurrentAlumni(fullCurrentAlumni);

      const [alumniRows, followingRows, followerRows, outgoingRows] =
        await Promise.all([
          getAllAlumni(500).catch(() => []),
          getFollowing(alumni.id).catch(() => []),
          getFollowers(alumni.id).catch(() => []),
          getSentPendingRequests(alumni.id).catch(() => []),
        ]);

      const connected = new Set([
        ...(Array.isArray(followingRows) ? followingRows : [])
          .map((row) => row?.followed?.id)
          .filter(Boolean),
        ...(Array.isArray(followerRows) ? followerRows : [])
          .map((row) => row?.follower?.id)
          .filter(Boolean),
      ]);

      const pending = new Set(
        (Array.isArray(outgoingRows) ? outgoingRows : [])
          .map((row) => row?.followed?.id)
          .filter(Boolean),
      );

      setAllAlumni(Array.isArray(alumniRows) ? alumniRows : []);
      setConnectedIds(connected);
      setPendingOutgoingIds(pending);
    } catch (fetchError) {
      console.error("Failed to load global alumni search:", fetchError);
      setErrorMessage("Unable to load alumni right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSearchData();
  }, [loadSearchData]);

  const handleRequestConnection = async (alumniItem) => {
    if (!currentAlumni?.id || !alumniItem?.id) return;

    setSendingIds((prev) => new Set(prev).add(alumniItem.id));
    try {
      await sendFollowRequest(currentAlumni.id, alumniItem.id);
      setPendingOutgoingIds((prev) => new Set(prev).add(alumniItem.id));
    } catch (requestError) {
      console.error("Failed to send connection request:", requestError);
      ThemedAlert.alert("Error", "Unable to send connection request right now.");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(alumniItem.id);
        return next;
      });
    }
  };

  // Group and filter the alumni data
  const { batchMates, programMates, otherAlumni } = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    const filtered = (allAlumni || []).filter((alumniItem) => {
      // Exclude self and already connected people from suggestions
      if (!alumniItem?.id || alumniItem.id === currentAlumni?.id) return false;
      if (connectedIds.has(alumniItem.id)) return false;

      // Filter by search query if present
      if (queryTokens.length > 0) {
        const fullName = `${alumniItem.first_name ?? ""} ${alumniItem.last_name ?? ""}`.trim().toLowerCase();
        const program = String(alumniItem.program ?? "").toLowerCase();
        const year = String(alumniItem.year_graduated ?? "").toLowerCase();
        const haystack = `${fullName} ${program} ${year}`;
        return queryTokens.every((token) => haystack.includes(token));
      }
      return true;
    });

    const myYear = currentAlumni?.year_graduated ? String(currentAlumni.year_graduated).slice(0, 4) : null;
    const myProgram = currentAlumni?.program ? String(currentAlumni.program).toLowerCase().trim() : null;

    const batch = [];
    const prog = [];
    const others = [];

    filtered.forEach((a) => {
      const theirYear = a.year_graduated ? String(a.year_graduated).slice(0, 4) : null;
      const theirProgram = a.program ? String(a.program).toLowerCase().trim() : null;

      if (myYear && theirYear === myYear) {
        batch.push(a);
      } else if (myProgram && theirProgram === myProgram) {
        prog.push(a);
      } else {
        others.push(a);
      }
    });

    return { batchMates: batch, programMates: prog, otherAlumni: others };
  }, [allAlumni, currentAlumni, connectedIds, query]);

  const toggleExpand = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderAlumniCard = (item) => {
    const fullName = `${item?.first_name ?? ""} ${item?.last_name ?? ""}`.trim() || "Alumni";
    
    // Split name intelligently for the 2-line display in mockup
    const nameParts = fullName.split(" ");
    const firstName = nameParts.slice(0, -1).join(" ") || fullName;
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    const year = item?.year_graduated ? String(item.year_graduated).slice(0, 4) : "XXXX";
    const program = item?.program || "Alumni";
    const isPending = pendingOutgoingIds.has(item.id);
    const isSending = sendingIds.has(item.id);
    const avatarUri = getAvatarUri(fullName, item?.alumni_photo);

    let actionLabel = "Connect";
    let actionDisabled = false;

    if (isPending) {
      actionLabel = "Pending";
      actionDisabled = true;
    } else if (isSending) {
      actionLabel = "Sending...";
      actionDisabled = true;
    }

    return (
      <View key={item.id} style={styles.cardWrapper}>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.cardHeader} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate("ProfileView", { userId: item.id })}
          >
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <Text style={styles.cardName} numberOfLines={2} textAlign="center">
              {firstName}
              {lastName ? `\n${lastName}` : ""}
            </Text>
            
            <View style={styles.tagPill}>
              <Ionicons name="school" size={10} color="#31429B" />
              <Text style={styles.tagText}>Class of {year} | {program}</Text>
            </View>

            {/* Simulated Mutual Connections row for Mockup matching */}
            <View style={styles.mutualRow}>
              <Image source={{ uri: avatarUri }} style={styles.mutualAvatar} />
              <Text style={styles.mutualText}>David and 19 other{"\n"}mutual connections</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={actionDisabled}
            onPress={() => handleRequestConnection(item)}
            style={[
              styles.connectButton,
              actionDisabled && styles.connectButtonDisabled,
            ]}
          >
            <Ionicons 
              name={isPending ? "time-outline" : "person-add-outline"} 
              size={14} 
              color="#FFFFFF" 
            />
            <Text style={styles.connectButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSection = (title, data, sectionKey) => {
    if (data.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];
    const visibleData = isExpanded ? data : data.slice(0, 4);

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.gridContainer}>
          {visibleData.map(renderAlumniCard)}
        </View>
        
        {data.length > 4 && (
          <TouchableOpacity 
            style={styles.showAllButton} 
            onPress={() => toggleExpand(sectionKey)}
          >
            <Text style={styles.showAllText}>
              {isExpanded ? "Show less" : "Show all"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopHeaderDark />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#31429B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
        <TopHeaderDark />

        {/* HERO SECTION WITH SEARCH OVERLAY */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroBackground}>
          
            
            <Image 
              source={require("../../assets/images/ExpandYourNetwork 1.png")} 
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* FLOATING SEARCH BAR */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* WHITE CONTENT AREA */}
        <View style={styles.whiteContentArea}>
          {errorMessage ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{errorMessage}</Text>
            </View>
          ) : batchMates.length === 0 && programMates.length === 0 && otherAlumni.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No alumni found matching your search.</Text>
            </View>
          ) : (
            <>
              {renderSection("People you may know from your Batch", batchMates, "batch")}
              {renderSection("Alumni from your program", programMates, "program")}
              {renderSection("People you may know", otherAlumni, "others")}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GlobalSearchScreen;