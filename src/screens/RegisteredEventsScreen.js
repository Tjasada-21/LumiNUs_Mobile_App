import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BrandHeader from "../components/BrandHeader";
import api from "../services/api";
import { normalizeEventImageUri } from "../utils/imageUtils";
import styles from "../styles/RegisteredEventsScreen.styles";

const formatDateRange = (startDate, endDate) => {
  if (!startDate) {
    return "Date to be announced";
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (Number.isNaN(start.getTime())) {
    return "Date to be announced";
  }

  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (
    !end ||
    Number.isNaN(end.getTime()) ||
    end.getTime() === start.getTime()
  ) {
    return startLabel;
  }

  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
};

const RegisteredEventsScreen = () => {
  const navigation = useNavigation();
  const [registrations, setRegistrations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState("");

  const fetchRegistrations = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get("/event-registrations");
      setRegistrations(response.data?.registrations ?? []);
    } catch (error) {
      console.error("Failed to load registered events:", error);
      setErrorMessage("Unable to load your registered events right now.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const goBackToExplore = () => {
    if (typeof navigation.jumpTo === "function") {
      navigation.jumpTo("Explore");
      return;
    }

    navigation.navigate("Explore");
  };

  const openEvent = (event) => {
    if (!event?.id) {
      return;
    }

    navigation.navigate("ViewEventsScreen", { event });
  };

  // Separate registrations into upcoming and past events
  const { upcomingRegistrations, pastRegistrations } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    registrations.forEach((registration) => {
      const event = registration?.event;
      if (!event?.start_date) {
        upcoming.push(registration);
        return;
      }

      const compareDate = new Date(event.end_date || event.start_date);
      // Set the time to the end of the day so it doesn't count as 'past' while it's still ongoing
      compareDate.setHours(23, 59, 59, 999);

      if (compareDate < now) {
        past.push(registration);
      } else {
        upcoming.push(registration);
      }
    });

    return { upcomingRegistrations: upcoming, pastRegistrations: past };
  }, [registrations]);

  const renderEventCard = (registration) => {
    const event = registration?.event;
    const eventImageUri = normalizeEventImageUri(
      event?.cover_image_url ??
        event?.images?.[0]?.image_path ??
        event?.cover_image ??
        "",
    );
    const imageSource = eventImageUri ? { uri: eventImageUri } : null;

    return (
      <Pressable
        key={`registered-event-${registration.id}`}
        style={({ pressed }) => [
          styles.eventCard,
          pressed ? styles.eventCardPressed : null,
        ]}
        onPress={() => openEvent(event)}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.eventImageFallback}>
            <Ionicons name="calendar-outline" size={22} color="#31429B" />
          </View>
        )}

        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event?.title ?? "Registered Event"}
          </Text>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {formatDateRange(event?.start_date, event?.end_date)}
          </Text>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {event?.venue?.name ?? event?.platform ?? "NU Lipa"}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <BrandHeader />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerCard}>
            <View style={styles.titleRow}>
              <Pressable
                onPress={goBackToExplore}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color="#31429B" />
              </Pressable>
              <Text style={styles.title}>Registered Events</Text>
            </View>
            <Text style={styles.subtitle}>
              Events you have already pre-registered for.
            </Text>
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="small" color="#31429B" />
              <Text style={styles.stateText}>
                Loading your registered events...
              </Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateCard}>
              <Ionicons name="alert-circle-outline" size={24} color="#B42318" />
              <Text style={styles.stateText}>{errorMessage}</Text>
            </View>
          ) : registrations.length === 0 ? (
            <View style={styles.stateCard}>
              <Ionicons name="calendar-outline" size={24} color="#8A94A6" />
              <Text style={styles.stateText}>
                You have no registered events yet.
              </Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              
              {/* Upcoming Events Section */}
              {upcomingRegistrations.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.title, { fontSize: 18, marginTop: 16, marginBottom: 12 }]}>
                    Upcoming Events
                  </Text>
                  {upcomingRegistrations.map(renderEventCard)}
                </View>
              )}

              {/* Past Events Section */}
              {pastRegistrations.length > 0 && (
                <View style={{ marginBottom: 16, opacity: 0.65 }}>
                  <Text style={[styles.title, { fontSize: 18, marginTop: 16, marginBottom: 12 }]}>
                    Past Events
                  </Text>
                  {pastRegistrations.map(renderEventCard)}
                </View>
              )}

            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default RegisteredEventsScreen;