import React, { useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/ViewPerkScreen.styles";

const formatValidUntil = (value) => {
  if (!value) {
    return "No expiry date";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const getPerkImageUris = (perk) =>
  Array.isArray(perk?.images)
    ? perk.images.map((image) => image?.image_path).filter(Boolean)
    : [];

const ViewPerkScreen = ({ navigation, route }) => {
  const perk = route?.params?.perk ?? {};
  const imageUris = useMemo(() => getPerkImageUris(perk), [perk]);
  const heroImageUri = imageUris[0] ?? null;
  const galleryImageUris = imageUris.slice(1);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        
        {/* Absolute floating dark header */}
        <TopHeaderDark />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* DEEP BLUE TOP SECTION */}
          <View style={styles.blueSection}>
            
            {/* Back Button & Title Row */}
            <View style={styles.titleRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={28} color="#FFD404" />
              </Pressable>
              <Text style={styles.titleText} numberOfLines={2}>
                {perk.title || "Untitled perk"}
              </Text>
            </View>

            {/* Hero Image */}
            <View style={styles.heroImageWrap}>
              {heroImageUri ? (
                <Image
                  source={{ uri: heroImageUri }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Ionicons name="pricetag-outline" size={44} color="#9CA3AF" />
                  <Text style={styles.heroPlaceholderText}>
                    No image available
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* YELLOW BOTTOM SECTION */}
          <View style={styles.yellowSectionContent}>
            
            {/* Other Attachments Gallery */}
            {galleryImageUris.length > 0 && (
              <View style={styles.gallerySection}>
                <Text style={styles.galleryLabel}>Other Attachments</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.galleryScroll}
                >
                  {galleryImageUris.map((imageUri, index) => (
                    <View
                      key={`${imageUri}-${index}`}
                      style={styles.galleryImageWrap}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* White Details Card */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Discount/Perk Details</Text>
              
              <Text style={styles.descriptionText}>
                {perk.description || "No description available."}
              </Text>

              {/* Valid Until Pill */}
              <View style={styles.validPill}>
                <Ionicons name="calendar" size={16} color="#FFD404" />
                <Text style={styles.validPillText}>
                  Valid until {formatValidUntil(perk.valid_until)}
                </Text>
              </View>
            </View>

          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ViewPerkScreen;