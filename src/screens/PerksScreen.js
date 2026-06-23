import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getPerks } from "../services/perkQueries";
import supabase from "../services/supabase";
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/PerksScreen.styles";

const formatValidUntil = (value) => {
  if (!value) {
    return "No expiry date";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const getPerkImageUri = (perk) => perk?.images?.[0]?.image_path ?? null;

const PerksScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompactWidth = width < 375;
  
  // Grid Math: Full width minus left/right padding minus the gap between cards
  const horizontalPadding = 16;
  const cardGap = 12;
  const cardWidth = useMemo(() => {
    const availableWidth = width - horizontalPadding * 2 - cardGap;
    return Math.floor(availableWidth / 2);
  }, [cardGap, horizontalPadding, width]);

  const [perks, setPerks] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchPerks = async () => {
    try {
      setErrorMessage("");
      const fetchedPerks = await getPerks();
      setPerks(fetchedPerks);
    } catch (error) {
      console.error("Failed to load perks:", error);
      setErrorMessage("Unable to load perks right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPerks();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel('public:perks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perks' }, () => {
        fetchPerks(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPerks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return perks;

    return perks.filter((perk) => {
      return [perk.title, perk.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [perks, query]);

  // Extract the latest perk to feature at the top
  const featuredPerk = perks.length > 0 ? perks[0] : null;
  
  // If searching, show all matches in the grid. If not searching, exclude the featured perk from the grid.
  const gridPerks = query.trim() ? filteredPerks : filteredPerks.slice(1);

  const renderPerkCard = ({ item }) => {
    const imageUri = getPerkImageUri(item);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { width: cardWidth },
          pressed && styles.cardPressed,
        ]}
        onPress={() => navigation.navigate("ViewPerkScreen", { perk: item })}
      >
        <View style={styles.cardImageWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="pricetag-outline" size={34} color="#94A3B8" />
              <Text style={styles.placeholderText}>No image</Text>
            </View>
          )}
        </View>

        <View style={styles.cardTextContent}>
          <View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Ionicons name="calendar-outline" size={13} color="#4A4A4A" />
            <Text style={styles.cardFooterText} numberOfLines={1}>
              Valid until {formatValidUntil(item.valid_until)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      
      {/* DEEP BLUE SECTION WITH LATEST FEATURED PERK */}
      <View style={styles.blueSection}>
        {featuredPerk && !query.trim() && (
          <Pressable
            style={styles.featuredCard}
            onPress={() => navigation.navigate("ViewPerkScreen", { perk: featuredPerk })}
          >
            <Image
              source={{ uri: getPerkImageUri(featuredPerk) }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
          </Pressable>
        )}
      </View>

      {/* WHITE SECTION WITH 3D BAGS */}
      <View style={styles.whiteSection}>
        <Image 
          source={require("../../assets/images/DiscountsPerks_Image 2.png")} 
          style={styles.heroImage} 
          resizeMode="contain"
        />
      </View>
      
      {/* YELLOW SECTION TEXT & SEARCH */}
      <View style={styles.yellowHeaderContent}>
        <Text style={[styles.heading, isTablet && styles.headingTablet]}>
          Explore All NU Alumni{"\n"}Discounts and Perks!
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#888888" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#888888"
            style={styles.searchInput}
          />
        </View>
      </View>

    </View>
  );

  return (
    // TopHeaderDark handles the top inset padding, so we omit "top" from the edges here
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        
        {/* NEW DARK HEADER */}
        <TopHeaderDark />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#1F2B67" />
            <Text style={styles.loadingText}>Loading perks...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateTitle}>Could not load perks</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                fetchPerks();
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={gridPerks}
            renderItem={renderPerkCard}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPerks();
            }}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <Text style={styles.stateTitle}>No perks found</Text>
                <Text style={styles.stateText}>
                  Try a different search term or check back later.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default PerksScreen;