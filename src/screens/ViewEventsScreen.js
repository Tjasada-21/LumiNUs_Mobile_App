import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  Linking,
  Image,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import TopHeaderDark from "../components/TopHeaderDark";
import api from "../services/api";
import styles from "../styles/ViewEventsScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

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
    month: "long",
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
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
};

const ViewEventsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const routeEvent = route?.params?.event ?? null;
  const [resolvedEvent, setResolvedEvent] = React.useState(routeEvent);
  const [registeredEventIds, setRegisteredEventIds] = React.useState([]);
  const [registrationsLoading, setRegistrationsLoading] = React.useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = React.useState(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = React.useState(0);
  const [galleryScale, setGalleryScale] = React.useState(1);
  const [galleryTranslate, setGalleryTranslate] = React.useState({ x: 0, y: 0 });
  
  const pinchStartDistanceRef = React.useRef(0);
  const pinchStartScaleRef = React.useRef(1);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const galleryViewerScrollRef = React.useRef(null);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Home", { screen: "EventsScreen" });
  };

  const event = resolvedEvent ?? routeEvent;
  const eventTitle = String(event?.title ?? "Event Details");
  const eventDescription = String(event?.description ?? "");
  const dateRange = formatDateRange(event?.start_date, event?.end_date);
  const platform = String(event?.platform ?? "Not set");
  const venueName = String(event?.venue?.name ?? "Venue not set");
  const venueAddress = event?.venue?.address ?? null;
  
  const displayLocation = venueName !== "Venue not set" ? venueName : (venueAddress || platform);

  const eventImageUris = Array.isArray(event?.images)
    ? event.images
        .map(
          (image) =>
            image?.image_url ?? image?.image_path ?? image?.url ?? image?.path,
        )
        .filter(Boolean)
    : [];
  const eventImageUri = eventImageUris[0] ?? event?.cover_image_url ?? null;
  const galleryImageUris = eventImageUris.slice(1, 5);
  const galleryViewportWidth = Dimensions.get("window").width;
  
  const isAlreadyRegistered = Boolean(
    event?.id && registeredEventIds.includes(Number(event.id)),
  );
  const canRegister = !registrationsLoading && !isAlreadyRegistered;
  const canRemoveRegistration = !registrationsLoading && isAlreadyRegistered;

  React.useEffect(() => {
    setResolvedEvent(routeEvent);
  }, [routeEvent]);

  React.useEffect(() => {
    let isMounted = true;

    const hydrateEventDetails = async () => {
      if (!routeEvent?.id) {
        return;
      }
      try {
        const response = await api.get(`/events/${routeEvent.id}`);
        const hydratedEvent = response.data?.event ?? null;

        if (!hydratedEvent || !isMounted) {
          return;
        }

        setResolvedEvent((currentEvent) => ({
          ...(currentEvent ?? {}),
          ...hydratedEvent,
          venue: {
            ...(currentEvent?.venue ?? {}),
            ...(hydratedEvent?.venue ?? {}),
          },
          images:
            Array.isArray(hydratedEvent?.images) &&
            hydratedEvent.images.length > 0
              ? hydratedEvent.images
              : currentEvent?.images,
          cover_image_url:
            hydratedEvent?.cover_image_url ??
            currentEvent?.cover_image_url ??
            null,
        }));
      } catch (error) {
        console.error("Failed to hydrate event details:", error);
      }
    };

    hydrateEventDetails();

    return () => {
      isMounted = false;
    };
  }, [routeEvent]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchRegistrations = async () => {
      if (!event?.id) {
        return;
      }
      try {
        setRegistrationsLoading(true);
        const response = await api.get("/event-registrations");
        const registrationIds = (response.data?.registrations ?? [])
          .map((registration) => Number(registration?.event_id))
          .filter((registrationId) => Number.isFinite(registrationId));

        if (isMounted) {
          setRegisteredEventIds(registrationIds);
        }
      } catch (error) {
        console.error("Failed to load event registrations:", error);
      } finally {
        if (isMounted) {
          setRegistrationsLoading(false);
        }
      }
    };

    fetchRegistrations();

    return () => {
      isMounted = false;
    };
  }, [event?.id]);

  const refreshRegistrationState = async () => {
    if (!event?.id) {
      return;
    }
    try {
      setRegistrationsLoading(true);
      const response = await api.get("/event-registrations");
      const registrationIds = (response.data?.registrations ?? [])
        .map((registration) => Number(registration?.event_id))
        .filter((registrationId) => Number.isFinite(registrationId));

      setRegisteredEventIds(registrationIds);
    } catch (error) {
      console.error("Failed to refresh event registrations:", error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handleRegisterPress = () => {
    if (!canRegister) {
      return;
    }
    navigation.navigate("EventRegistrationScreen", { event });
  };

  const handleRemoveRegistrationPress = () => {
    if (!canRemoveRegistration || !event?.id) {
      return;
    }

    ThemedAlert.alert(
      "Remove registration?",
      "This will delete your registration for this event.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/events/${event.id}/registrations`);
              await refreshRegistrationState();
              navigation.navigate("Home", { screen: "EventsScreen" });
            } catch (error) {
              const message =
                error.response?.data?.message ??
                "Unable to remove your registration right now.";
              ThemedAlert.alert("Removal failed", message, [{ text: "OK" }], {
                variant: "error",
              });
            }
          },
        },
      ],
      { variant: "error" },
    );
  };

  const openGalleryImage = (imageIndex) => {
    if (!galleryImageUris[imageIndex]) {
      return;
    }
    setGalleryScale(1);
    setGalleryTranslate({ x: 0, y: 0 });
    setSelectedGalleryIndex(imageIndex);
    setSelectedGalleryImage(galleryImageUris[imageIndex]);
  };

  const closeGalleryImage = () => {
    setGalleryScale(1);
    setGalleryTranslate({ x: 0, y: 0 });
    setSelectedGalleryIndex(0);
    setSelectedGalleryImage(null);
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) {
      return 0;
    }
    const firstTouch = touches[0];
    const secondTouch = touches[1];
    const deltaX = secondTouch.pageX - firstTouch.pageX;
    const deltaY = secondTouch.pageY - firstTouch.pageY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  };

  const clampGalleryScale = (value) => Math.max(1, Math.min(4, value));

  React.useEffect(() => {
    if (!selectedGalleryImage) {
      return;
    }
    requestAnimationFrame(() => {
      galleryViewerScrollRef.current?.scrollTo({
        x: selectedGalleryIndex * galleryViewportWidth,
        y: 0,
        animated: false,
      });
    });
  }, [selectedGalleryImage, selectedGalleryIndex, galleryViewportWidth]);

  const galleryPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (gestureState.numberActiveTouches >= 2) {
            return true;
          }
          return (
            galleryScale > 1 &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2)
          );
        },
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches ?? [];
          if (touches.length >= 2) {
            pinchStartDistanceRef.current = getTouchDistance(touches);
            pinchStartScaleRef.current = galleryScale;
          }
          dragStartRef.current = { ...galleryTranslate };
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches ?? [];

          if (touches.length >= 2) {
            if (pinchStartDistanceRef.current === 0) {
              pinchStartDistanceRef.current = getTouchDistance(touches);
              pinchStartScaleRef.current = galleryScale;
              return;
            }
            const currentDistance = getTouchDistance(touches);
            const nextScale = clampGalleryScale(
              pinchStartScaleRef.current *
                (currentDistance / pinchStartDistanceRef.current),
            );
            setGalleryScale(nextScale);
            return;
          }

          if (galleryScale > 1) {
            setGalleryTranslate({
              x: dragStartRef.current.x + gestureState.dx,
              y: dragStartRef.current.y + gestureState.dy,
            });
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          if (galleryScale <= 1.02) {
            setGalleryScale(1);
            setGalleryTranslate({ x: 0, y: 0 });
          }
          pinchStartDistanceRef.current = 0;
          pinchStartScaleRef.current = 1;
        },
        onPanResponderTerminate: () => {
          if (galleryScale <= 1.02) {
            setGalleryScale(1);
            setGalleryTranslate({ x: 0, y: 0 });
          }
          pinchStartDistanceRef.current = 0;
          pinchStartScaleRef.current = 1;
        },
      }),
    [galleryScale, galleryTranslate],
  );

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopHeaderDark />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.blueHeroSection}>
            <View style={styles.titleRow}>
              <Pressable onPress={handleBackPress} hitSlop={10} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={26} color="#FFD404" />
              </Pressable>
              <Text style={styles.pageTitle} numberOfLines={3}>{eventTitle}</Text>
            </View>

            {eventImageUri ? (
              <Image source={{ uri: eventImageUri }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="image-outline" size={40} color="#8A96D4" />
              </View>
            )}
          </View>

          {galleryImageUris.length > 0 && (
            <View style={styles.attachmentsSection}>
              <Text style={styles.attachmentsTitle}>Other Attachments</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {galleryImageUris.map((uri, index) => (
                  <Pressable key={index} onPress={() => openGalleryImage(index)}>
                    <Image source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Event Details</Text>
            <Text style={styles.descriptionText}>{eventDescription}</Text>
            
            <View style={styles.dateLocationCard}>
              <Text style={styles.dateLocationTitle}>Date & Location</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color="#FFD404" />
                <Text style={styles.infoText}>{dateRange}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#FFD404" />
                <Text style={styles.infoText}>{displayLocation}</Text>
              </View>
            </View>
          </View>

          <Pressable 
            style={[styles.registerButtonOutline, isAlreadyRegistered && styles.registerButtonDestructive]} 
            onPress={isAlreadyRegistered ? handleRemoveRegistrationPress : handleRegisterPress}
            disabled={registrationsLoading || (!isAlreadyRegistered && !canRegister)}
          >
            {registrationsLoading ? (
              <ActivityIndicator color="#31429B" />
            ) : (
              <Text style={[styles.registerButtonOutlineText, isAlreadyRegistered && styles.registerButtonDestructiveText]}>
                {isAlreadyRegistered ? "Remove Registration" : "Pre-Register Now!"}
              </Text>
            )}
          </Pressable>

        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#FFD404" }} />

      <Modal
        visible={Boolean(selectedGalleryImage)}
        transparent
        animationType="fade"
        onRequestClose={closeGalleryImage}
      >
        <View style={styles.galleryModalBackdrop}>
          <View style={styles.galleryModalContent}>
            <Pressable
              style={styles.galleryModalCloseButton}
              onPress={closeGalleryImage}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <ScrollView
              ref={galleryViewerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.galleryModalScroll}
              contentContainerStyle={styles.galleryModalScrollContent}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x /
                    event.nativeEvent.layoutMeasurement.width,
                );
                setSelectedGalleryIndex(nextIndex);
                setSelectedGalleryImage(galleryImageUris[nextIndex] ?? null);
                setGalleryScale(1);
                setGalleryTranslate({ x: 0, y: 0 });
              }}
            >
              {galleryImageUris.map((imageUri, index) => (
                <View
                  key={`${imageUri}-${index}`}
                  style={[
                    styles.galleryModalStage,
                    { width: galleryViewportWidth },
                  ]}
                  {...galleryPanResponder.panHandlers}
                >
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      styles.galleryModalImage,
                      {
                        transform: [
                          { translateX: galleryTranslate.x },
                          { translateY: galleryTranslate.y },
                          { scale: galleryScale },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ViewEventsScreen;