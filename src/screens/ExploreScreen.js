import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clamp, responsiveWidth } from "../utils/responsive";
import styles from "../styles/ExploreScreen.styles";

import { ThemedAlert } from "../components/ThemedAlert";

const SECTION_DATA = [
  {
    title: "Alumni Files",
    items: [
      {
        label: "Digital\nYearbook",
        icon: require("../../assets/images/digital-yearbook-icon-in-blue.png"),
        action: "goToViewYearbook",
      },
      {
        label: "NU Alumni ID",
        icon: require("../../assets/images/frame-12.png"),
        action: "goToAlumniId",
      },
      {
        label: "Alumni\nTracer",
        icon: require("../../assets/images/trace-icon-in-blue.png"),
        action: "goToAlumniTracer",
      },
    ],
  },
  {
    title: "Campus Engagement",
    items: [
      {
        label: "Registrations",
        icon: require("../../assets/images/registration-icon-in-blue-1.png"),
        action: "goToEventRegistration",
      },
      {
        label: "University Events",
        icon: require("../../assets/images/view-uni-events-icon-in-blue-1.png"),
        action: "goToEventsScreen",
      },
      {
        label: "Messages",
        icon: require("../../assets/images/messages-id-icon-in-blue-1.png"),
        action: "goToMessages",
      },
    ],
  },
  {
    title: "Other",
    items: [
      {
        label: "My Feed",
        icon: require("../../assets/images/feed-icon-in-blue-1.png"),
        action: "goToFeed",
      },
      {
        label: "Perks and\nDiscounts",
        icon: require("../../assets/images/view-perks-icon-in-blue-1.png"),
        action: "goToPerks",
      },
      {
        label: "NU Website",
        icon: require("../../assets/images/nu-lipa-logo-portrait-white-version-21.png"),
        action: "openUrl",
        url: "https://national-u.edu.ph",
      },
    ],
  },
];

const ExploreScreen = ({ navigation }) => {
  // SECTION: Layout values
  const { width } = useWindowDimensions();
  const itemWidth = clamp((width - 52) / 3, 92, 132);
  const iconWrapSize = clamp(width * 0.22, 74, 92);
  const iconSize = clamp(width * 0.15, 48, 60);
  const logoWidth = responsiveWidth(width, 0.52, 174, 240);
  const logoHeight = clamp(width * 0.16, 48, 72);
  const scrollPaddingHorizontal = width < 375 ? 12 : 14;

  // HANDLER: Open a section destination
  const handleItemPress = useCallback((item) => {
    const parentNavigator = navigation.getParent?.();

    switch (item.action) {
      case "goToViewYearbook":
        navigation.navigate("ViewYearbook");
        break;

      case "goToAlumniTracer":
        navigation.navigate("TracerMenu");
        break;

      case "goToEventRegistration":
        if (parentNavigator?.navigate) {
          parentNavigator.navigate("RegisteredEventsScreen");
        } else {
          navigation.navigate("RegisteredEventsScreen");
        }
        break;

      case "goToEventsScreen":
        if (parentNavigator?.navigate) {
          parentNavigator.navigate("EventsScreen");
        } else {
          navigation.navigate("Home", { screen: "EventsScreen" });
        }
        break;

      case "goToFeed":
        if (typeof navigation.jumpTo === "function") {
          navigation.jumpTo("Feed");
        } else {
          navigation.navigate("Feed");
        }
        break;

      case "goToPerks":
        navigation.navigate("Perks");
        break;

      case "goToAlumniId":
        if (parentNavigator?.navigate) {
          parentNavigator.navigate("HomeTab");
        } else {
          navigation.navigate("HomeTab");
        }
        break;

      case "goToMessages":
        if (typeof navigation.jumpTo === "function") {
          navigation.jumpTo("Messages");
        } else {
          navigation.navigate("Messages");
        }
        break;

      case "openUrl":
        if (item.url) {
          Linking.canOpenURL(item.url)
            .then((supported) => {
              if (supported) {
                return Linking.openURL(item.url);
              }
              throw new Error("Cannot open URL");
            })
            .catch((err) => {
              console.error("Failed to open URL", err);
              ThemedAlert.alert(
                "Unable to open link",
                "Could not open the website."
              );
            });
        }
        break;

      default:
        console.warn(`Unhandled action: ${item.action}`);
        break;
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.gradientOverlayTop} />
        <View style={styles.gradientOverlayBottom} />

        {/* SECTION: Explore sections */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: scrollPaddingHorizontal },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("../../assets/images/lumi-n-us-logo-landscape-2.png")}
            style={[styles.logo, { width: logoWidth, height: logoHeight }]}
            resizeMode="contain"
          />

          {SECTION_DATA.map((section) => (
            <View key={section.title} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title}</Text>

              <View style={styles.itemRow}>
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={`${section.title}-${item.label}`}
                    style={[styles.itemBtn, { width: itemWidth }]}
                    activeOpacity={0.85}
                    onPress={() => handleItemPress(item)}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        { width: iconWrapSize, height: iconWrapSize },
                      ]}
                    >
                      <Image
                        source={item.icon}
                        style={[
                          styles.icon,
                          { width: iconSize, height: iconSize },
                        ]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ExploreScreen;