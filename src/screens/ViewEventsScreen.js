import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import { WebView } from "react-native-webview";
import TopHeaderDark from "../components/TopHeaderDark";
import api from "../services/api";
import styles from "../styles/ViewEventsScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

const formatDateRange = (startDate, endDate) => {
  if (!startDate) return "Date to be announced";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (Number.isNaN(start.getTime())) return "Date to be announced";

  const startLabel = start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!end || Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) {
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

  // Map & Geocoding States
  const [resolvedVenueCoordinates, setResolvedVenueCoordinates] = React.useState(null);
  const [resolvingVenueCoordinates, setResolvingVenueCoordinates] = React.useState(false);
  const [mapLoadFailed, setMapLoadFailed] = React.useState(false);
  
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
  const platformUrl = String(event?.platform_url ?? "").trim();
  const rawEventType = String(
    event?.event_type ?? event?.eventType ?? event?.type ?? event?.event_category ?? "",
  ).trim();
  
  const venueName = String(event?.venue?.name ?? "Venue not set");
  const venueAddress = event?.venue?.address ?? null;
  const payloadVenueLatitude = Number.parseFloat(
    event?.venue?.latitude ?? event?.venue?.lat ?? event?.venue_latitude ?? event?.latitude ?? event?.lat,
  );
  const payloadVenueLongitude = Number.parseFloat(
    event?.venue?.longitude ?? event?.venue?.lng ?? event?.venue_longitude ?? event?.longitude ?? event?.lng,
  );
  const hasPayloadVenueCoordinates = Number.isFinite(payloadVenueLatitude) && Number.isFinite(payloadVenueLongitude);
  
  const venueSearchQuery = [venueName, venueAddress]
    .filter((value) => value && !String(value).toLowerCase().includes("not available") && !String(value).toLowerCase().includes("not set"))
    .join(" ").trim();
    
  const venueLatitude = hasPayloadVenueCoordinates ? payloadVenueLatitude : Number.parseFloat(resolvedVenueCoordinates?.latitude);
  const venueLongitude = hasPayloadVenueCoordinates ? payloadVenueLongitude : Number.parseFloat(resolvedVenueCoordinates?.longitude);
  const hasVenueCoordinates = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude);
  
  const hasVirtualElement = Boolean(platformUrl) || platform !== "Not set";
  const hasPhysicalElement = hasVenueCoordinates || Boolean(venueSearchQuery);

  const inferredEventType = rawEventType 
    ? rawEventType 
    : (hasVirtualElement && hasPhysicalElement) ? "hybrid" 
    : hasVirtualElement ? "online" 
    : hasPhysicalElement ? "in person" : "";

  const normalizedEventType = String(inferredEventType).toLowerCase().replace(/[_-]/g, " ").trim();
  
  // Smart detection for Hybrid, Online, and In-Person elements
  const isHybridEvent = normalizedEventType === "hybrid" || (hasVirtualElement && hasPhysicalElement);
  const isOnlineEvent = ["online", "virtual"].includes(normalizedEventType) || isHybridEvent || hasVirtualElement;
  const isInPersonEvent = ["in person", "inperson", "physical", "onsite", "on site"].includes(normalizedEventType) || isHybridEvent || hasPhysicalElement;
  
  const eventImageUris = Array.isArray(event?.images)
    ? event.images.map((image) => image?.image_url ?? image?.image_path ?? image?.url ?? image?.path).filter(Boolean)
    : [];
  const eventImageUri = eventImageUris[0] ?? event?.cover_image_url ?? null;
  const galleryImageUris = eventImageUris.slice(1, 5);
  const galleryViewportWidth = Dimensions.get("window").width;
  
  const venueMapEmbedUri = hasVenueCoordinates
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%;overflow:hidden}</style></head><body><div id="map"></div><script>var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${venueLatitude},${venueLongitude}],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);L.marker([${venueLatitude},${venueLongitude}]).addTo(map);<\/script></body></html>`
    : null;
  const venueExternalMapUri = hasVenueCoordinates
    ? `https://www.openstreetmap.org/?mlat=${venueLatitude}&mlon=${venueLongitude}&zoom=16`
    : venueSearchQuery ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(venueSearchQuery)}` : null;

  const isAlreadyRegistered = Boolean(event?.id && registeredEventIds.includes(Number(event.id)));
  const canRegister = !registrationsLoading && !isAlreadyRegistered;
  const canRemoveRegistration = !registrationsLoading && isAlreadyRegistered;

  React.useEffect(() => {
    setResolvedEvent(routeEvent);
  }, [routeEvent]);

  React.useEffect(() => {
    setMapLoadFailed(false);
  }, [venueLatitude, venueLongitude]);

  React.useEffect(() => {
    let isMounted = true;
    const resolveVenueCoordinates = async () => {
      if (hasPayloadVenueCoordinates || !venueSearchQuery) {
        if (isMounted) {
          setResolvedVenueCoordinates(null);
          setResolvingVenueCoordinates(false);
        }
        return;
      }
      try {
        setResolvingVenueCoordinates(true);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(venueSearchQuery)}`, {
          headers: { Accept: "application/json", "User-Agent": "LumiNUsMobile/1.0" },
        });
        const responseText = await response.text();
        if (!response.ok) return;
        let results = [];
        try { results = JSON.parse(responseText); } catch (e) { return; }
        const firstMatch = Array.isArray(results) ? results[0] : null;
        if (!firstMatch || !isMounted) return;
        const latitude = Number.parseFloat(firstMatch?.lat);
        const longitude = Number.parseFloat(firstMatch?.lon);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setResolvedVenueCoordinates({ latitude, longitude });
        }
      } catch (error) {
        console.error("Failed to resolve venue coordinates:", error);
      } finally {
        if (isMounted) setResolvingVenueCoordinates(false);
      }
    };
    resolveVenueCoordinates();
    return () => { isMounted = false; };
  }, [hasPayloadVenueCoordinates, venueSearchQuery]);

  React.useEffect(() => {
    let isMounted = true;
    const hydrateEventDetails = async () => {
      if (!routeEvent?.id) return;
      try {
        const response = await api.get(`/events/${routeEvent.id}`);
        const hydratedEvent = response.data?.event ?? null;
        if (!hydratedEvent || !isMounted) return;
        setResolvedEvent((currentEvent) => ({
          ...(currentEvent ?? {}),
          ...hydratedEvent,
          venue: { ...(currentEvent?.venue ?? {}), ...(hydratedEvent?.venue ?? {}) },
          images: Array.isArray(hydratedEvent?.images) && hydratedEvent.images.length > 0 ? hydratedEvent.images : currentEvent?.images,
          cover_image_url: hydratedEvent?.cover_image_url ?? currentEvent?.cover_image_url ?? null,
        }));
      } catch (error) {
        console.error("Failed to hydrate event details:", error);
      }
    };
    hydrateEventDetails();
    return () => { isMounted = false; };
  }, [routeEvent]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchRegistrations = async () => {
      if (!event?.id) return;
      try {
        setRegistrationsLoading(true);
        const response = await api.get("/event-registrations");
        const registrationIds = (response.data?.registrations ?? [])
          .map((reg) => Number(reg?.event_id))
          .filter((id) => Number.isFinite(id));
        if (isMounted) setRegisteredEventIds(registrationIds);
      } catch (error) {
        console.error("Failed to load event registrations:", error);
      } finally {
        if (isMounted) setRegistrationsLoading(false);
      }
    };
    fetchRegistrations();
    return () => { isMounted = false; };
  }, [event?.id]);

  const refreshRegistrationState = async () => {
    if (!event?.id) return;
    try {
      setRegistrationsLoading(true);
      const response = await api.get("/event-registrations");
      const registrationIds = (response.data?.registrations ?? []).map((reg) => Number(reg?.event_id)).filter((id) => Number.isFinite(id));
      setRegisteredEventIds(registrationIds);
    } catch (error) {
      console.error("Failed to refresh event registrations:", error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handlePlatformPress = async () => {
    if (!platformUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(platformUrl);
      if (canOpen) await Linking.openURL(platformUrl);
    } catch (error) { console.error("Failed to open platform URL:", error); }
  };

  const handleVenueMapPress = async () => {
    if (!venueExternalMapUri) return;
    try {
      const canOpen = await Linking.canOpenURL(venueExternalMapUri);
      if (canOpen) await Linking.openURL(venueExternalMapUri);
    } catch (error) { console.error("Failed to open map URL:", error); }
  };

  const handleRegisterPress = () => {
    if (!canRegister) return;
    navigation.navigate("EventRegistrationScreen", { event });
  };

  const handleRemoveRegistrationPress = () => {
    if (!canRemoveRegistration || !event?.id) return;
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
              const message = error.response?.data?.message ?? "Unable to remove your registration right now.";
              ThemedAlert.alert("Removal failed", message, [{ text: "OK" }], { variant: "error" });
            }
          },
        },
      ],
      { variant: "error" },
    );
  };

  const openGalleryImage = (imageIndex) => {
    if (!galleryImageUris[imageIndex]) return;
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
    if (!touches || touches.length < 2) return 0;
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clampGalleryScale = (val) => Math.max(1, Math.min(4, val));

  React.useEffect(() => {
    if (!selectedGalleryImage) return;
    requestAnimationFrame(() => {
      galleryViewerScrollRef.current?.scrollTo({ x: selectedGalleryIndex * galleryViewportWidth, y: 0, animated: false });
    });
  }, [selectedGalleryImage, selectedGalleryIndex, galleryViewportWidth]);

  const galleryPanResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      if (gestureState.numberActiveTouches >= 2) return true;
      return (galleryScale > 1 && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2));
    },
    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches ?? [];
      if (touches.length >= 2) {
        pinchStartDistanceRef.current = getTouchDistance(touches);
        pinchStartScaleRef.current = galleryScale;
      }
      dragStartRef.current = { ...galleryTranslate };
    },
    onPanResponderMove: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches ?? [];
      if (touches.length >= 2) {
        if (pinchStartDistanceRef.current === 0) {
          pinchStartDistanceRef.current = getTouchDistance(touches);
          pinchStartScaleRef.current = galleryScale;
          return;
        }
        const currentDistance = getTouchDistance(touches);
        const nextScale = clampGalleryScale(pinchStartScaleRef.current * (currentDistance / pinchStartDistanceRef.current));
        setGalleryScale(nextScale);
        return;
      }
      if (galleryScale > 1) {
        setGalleryTranslate({ x: dragStartRef.current.x + gestureState.dx, y: dragStartRef.current.y + gestureState.dy });
      }
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: () => {
      if (galleryScale <= 1.02) { setGalleryScale(1); setGalleryTranslate({ x: 0, y: 0 }); }
      pinchStartDistanceRef.current = 0;
      pinchStartScaleRef.current = 1;
    },
    onPanResponderTerminate: () => {
      if (galleryScale <= 1.02) { setGalleryScale(1); setGalleryTranslate({ x: 0, y: 0 }); }
      pinchStartDistanceRef.current = 0;
      pinchStartScaleRef.current = 1;
    },
  }), [galleryScale, galleryTranslate]);

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
              
              {/* Event Badge (Hybrid vs In-Person) */}
              {isHybridEvent ? (
                <View style={[styles.inPersonBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.inPersonBadgeText}>HYBRID</Text>
                </View>
              ) : isInPersonEvent ? (
                <View style={styles.inPersonBadge}>
                  <Text style={styles.inPersonBadgeText}>IN-PERSON</Text>
                </View>
              ) : null}
              
              <Text style={styles.dateLocationTitle}>Date & Location</Text>
              
              <View style={styles.infoRowTop}>
                <Ionicons name="calendar-outline" size={16} color="#FFD404" style={styles.iconTop} />
                <Text style={styles.infoTextCol}>{dateRange}</Text>
              </View>
              
              {/* Virtual Details */}
              {isOnlineEvent && platform !== "Not set" && (
                 <View style={styles.infoRowTop}>
                    <Ionicons name="globe-outline" size={16} color="#FFD404" style={styles.iconTop} />
                    <View style={styles.infoTextCol}>
                       <Text style={styles.infoText}>{platform}</Text>
                       {platformUrl ? (
                          <Pressable onPress={handlePlatformPress}>
                             <Text style={[styles.infoSubText, { textDecorationLine: "underline" }]} numberOfLines={1}>{platformUrl}</Text>
                          </Pressable>
                       ) : null}
                    </View>
                 </View>
              )}

              {/* Physical Venue Details */}
              {isInPersonEvent && venueName !== "Venue not set" && (
                 <View style={styles.infoRowTop}>
                    <Ionicons name="location-outline" size={16} color="#FFD404" style={styles.iconTop} />
                    <View style={styles.infoTextCol}>
                       <Text style={styles.infoText}>{venueName}</Text>
                       {venueAddress ? <Text style={styles.infoSubText}>{venueAddress}</Text> : null}
                    </View>
                 </View>
              )}
            </View>

            {/* Map renders if there is a physical location */}
            {isInPersonEvent && (
              <View style={styles.mapSection}>
                <Text style={styles.mapTitle}>Map</Text>
                {venueMapEmbedUri && !mapLoadFailed ? (
                  <Pressable style={styles.mapContainer} onPress={handleVenueMapPress}>
                    <WebView
                      source={{ html: venueMapEmbedUri }}
                      style={styles.mapWebView}
                      scrollEnabled={false}
                      javaScriptEnabled
                      domStorageEnabled
                      originWhitelist={["*"]}
                      mixedContentMode="always"
                      onError={() => setMapLoadFailed(true)}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.mapFallback}>
                    <Ionicons name="map-outline" size={24} color="#64748B" />
                    <Text style={styles.mapFallbackText}>
                      {resolvingVenueCoordinates
                        ? "Finding venue on map..."
                        : "Map coordinates are not available for this venue."}
                    </Text>
                    {venueExternalMapUri ? (
                      <Pressable onPress={handleVenueMapPress}>
                        <Text style={[styles.infoText, { color: "#31429B", textDecorationLine: "underline", marginTop: 4 }]}>Open in Maps</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            )}

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

      <Modal visible={Boolean(selectedGalleryImage)} transparent animationType="fade" onRequestClose={closeGalleryImage}>
        <View style={styles.galleryModalBackdrop}>
          <View style={styles.galleryModalContent}>
            <Pressable style={styles.galleryModalCloseButton} onPress={closeGalleryImage}>
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
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
                setSelectedGalleryIndex(nextIndex);
                setSelectedGalleryImage(galleryImageUris[nextIndex] ?? null);
                setGalleryScale(1);
                setGalleryTranslate({ x: 0, y: 0 });
              }}
            >
              {galleryImageUris.map((imageUri, index) => (
                <View key={`${imageUri}-${index}`} style={[styles.galleryModalStage, { width: galleryViewportWidth }]} {...galleryPanResponder.panHandlers}>
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      styles.galleryModalImage,
                      { transform: [{ translateX: galleryTranslate.x }, { translateY: galleryTranslate.y }, { scale: galleryScale }] },
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