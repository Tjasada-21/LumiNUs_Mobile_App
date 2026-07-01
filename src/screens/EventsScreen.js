import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  useWindowDimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import HomeHeader from "../components/HomeHeader";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getAllEvents,
  getUserEventRegistrations,
} from "../services/eventQueries";
import styles from "../styles/EventsScreen.styles";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const formatEventDateRange = (startDate, endDate) => {
  if (!startDate) return "Date to be announced";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (Number.isNaN(start.getTime())) return "Date to be announced";
  const startLabel = start.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  return startLabel; 
};

const getEventLocationLabel = (event) => {
  if (event?.venue?.name) return event.venue.name;
  if (event?.platform) return event.platform;
  return "NU Lipa";
};

const getRegisteredEventLocationLabel = (registration) => {
  if (registration?.event?.venue?.name) return registration.event.venue.name;
  if (registration?.event?.platform) return registration.event.platform;
  return "NU Lipa";
};

const formatRegisteredEventDate = (registration) => {
  return formatEventDateRange(registration?.event?.start_date, registration?.event?.end_date);
};

const buildEventDayCountMap = (eventList, year, monthIndex) => {
  const dayCountMap = new Map();
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  eventList.forEach((event) => {
    const startDate = new Date(event?.start_date);
    const endDate = event?.end_date ? new Date(event.end_date) : null;
    if (Number.isNaN(startDate.getTime())) return;

    const rangeStart = startDate < monthStart ? monthStart : startDate;
    const rawRangeEnd = endDate && !Number.isNaN(endDate.getTime()) ? endDate : startDate;
    const rangeEnd = rawRangeEnd > monthEnd ? monthEnd : rawRangeEnd;

    if (rangeEnd < monthStart || rangeStart > monthEnd) return;

    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const finalDate = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

    while (cursor <= finalDate) {
      const day = cursor.getDate();
      dayCountMap.set(day, (dayCountMap.get(day) ?? 0) + 1);
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return dayCountMap;
};

const doesEventOccurOnDate = (event, targetDate) => {
  if (!event?.start_date || !targetDate) return false;
  const startDate = new Date(event.start_date);
  const rawEndDate = event?.end_date ? new Date(event.end_date) : null;
  if (Number.isNaN(startDate.getTime())) return false;

  const endDate = rawEndDate && !Number.isNaN(rawEndDate.getTime()) ? rawEndDate : startDate;
  const eventStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const eventEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const selected = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  return selected >= eventStart && selected <= eventEnd;
};

const getMonthDays = (year, monthIndex) => {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const leadingEmptyCells = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
};

const EventsScreen = ({ navigation }) => {
  const [calendarVisible, setCalendarVisible] = React.useState(false);
  const [registrationsVisible, setRegistrationsVisible] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [events, setEvents] = React.useState([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [isRefreshingEvents, setIsRefreshingEvents] = React.useState(false);
  const [eventsError, setEventsError] = React.useState("");
  const [registeredEvents, setRegisteredEvents] = React.useState([]);
  const [registeredEventsLoading, setRegisteredEventsLoading] = React.useState(false);
  const [registeredEventsError, setRegisteredEventsError] = React.useState("");
  const [selectedCalendarDay, setSelectedCalendarDay] = React.useState(null);
  
  const isMountedRef = React.useRef(true);
  const monthFadeAnimation = React.useRef(new Animated.Value(1)).current;
  const isMonthAnimatingRef = React.useRef(false);
  const bubblePopAnimation = React.useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const calendarWidth = Math.min(screenWidth - 40, 360);
  const calendarContentWidth = calendarWidth - 36;

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const monthDays = getMonthDays(currentYear, currentMonth);
  const eventDayCountMap = React.useMemo(() => buildEventDayCountMap(events, currentYear, currentMonth), [events, currentYear, currentMonth]);
  
  const normalizedQuery = searchQuery.trim().toLowerCase();
  
  const visibleEvents = events.filter((event) => {
    if (event?.end_date) {
      const endDate = new Date(event.end_date);
      if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) return false;
    } else if (event?.start_date) {
      const startDate = new Date(event.start_date);
      if (!Number.isNaN(startDate.getTime()) && startDate < new Date()) return false;
    }
    if (!normalizedQuery) return true;
    return [event.title, event.description, event.venue?.name, event.platform].some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedQuery),
    );
  });

  const visibleFeaturedItems = visibleEvents.slice(0, 4);
  
  const visibleComingSoonItems = React.useMemo(() => {
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() + 1);
    return events
      .filter((event) => {
        if (!event?.start_date) return false;
        const start = new Date(event.start_date);
        if (Number.isNaN(start.getTime())) return false;
        return start >= threshold;
      })
      .filter((event) => {
        if (!normalizedQuery) return true;
        return [event.title, event.description, event.venue?.name, event.platform].some((value) =>
          String(value ?? "").toLowerCase().includes(normalizedQuery),
        );
      })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 4);
  }, [events, normalizedQuery]);

  const selectedCalendarDate = selectedCalendarDay ? new Date(currentYear, currentMonth, selectedCalendarDay) : null;
  const selectedDayEvents = React.useMemo(() => {
    if (!selectedCalendarDate) return [];
    return events
      .filter((event) => doesEventOccurOnDate(event, selectedCalendarDate))
      .sort((firstEvent, secondEvent) => new Date(firstEvent?.start_date) - new Date(secondEvent?.start_date));
  }, [events, selectedCalendarDate]);

  const selectedCalendarDayEventPreview = React.useMemo(() => {
    if (!selectedDayEvents.length) return [];
    return selectedDayEvents.slice(0, 2);
  }, [selectedDayEvents]);
  const selectedCalendarDayOverflowCount = Math.max(selectedDayEvents.length - selectedCalendarDayEventPreview.length, 0);
  const hasPreRegisteredEvents = registeredEvents.length > 0;

  const getCalendarBubbleAnchorStyle = React.useCallback((dayCellIndex) => {
    const weekdayColumn = dayCellIndex % 7;
    if (weekdayColumn <= 1) return { bubble: styles.calendarDayEventBubbleAnchorLeft, arrow: styles.calendarDayEventBubbleArrowLeft };
    if (weekdayColumn >= 5) return { bubble: styles.calendarDayEventBubbleAnchorRight, arrow: styles.calendarDayEventBubbleArrowRight };
    return { bubble: styles.calendarDayEventBubbleAnchorCenter, arrow: styles.calendarDayEventBubbleArrowCenter };
  }, []);

  const bubbleAnimatedStyle = React.useMemo(() => ({
      opacity: bubblePopAnimation,
      transform: [
        { scale: bubblePopAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
        { translateY: bubblePopAnimation.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
      ],
    }), [bubblePopAnimation]);

  React.useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (!selectedCalendarDay || selectedDayEvents.length === 0) {
      bubblePopAnimation.setValue(0);
      return;
    }
    bubblePopAnimation.setValue(0);
    Animated.spring(bubblePopAnimation, { toValue: 1, speed: 18, bounciness: 9, useNativeDriver: true }).start();
  }, [bubblePopAnimation, selectedCalendarDay, selectedDayEvents.length]);

  const openCalendar = () => { setSelectedCalendarDay(null); setCalendarVisible(true); };
  const openRegistrations = () => setRegistrationsVisible(true);
  const closeCalendar = () => { setSelectedCalendarDay(null); setCalendarVisible(false); };
  const closeRegistrations = () => setRegistrationsVisible(false);
  const handleCalendarDayPress = (day) => { if (day) setSelectedCalendarDay(day); };

  const fetchEvents = React.useCallback(async ({ showRefreshingState = false } = {}) => {
    try {
      if (showRefreshingState) setIsRefreshingEvents(true);
      else setEventsLoading(true);
      setEventsError("");

      try {
        const fetched = await getAllEvents(50, 0);
        if (!isMountedRef.current) return;
        setEvents(Array.isArray(fetched) ? fetched : []);
      } catch (fetchError) {
        if (isMountedRef.current) {
          setEventsError("Unable to load events right now.");
          setEvents([]);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setEventsLoading(false);
        setIsRefreshingEvents(false);
      }
    }
  }, []);

  const fetchRegistrations = React.useCallback(async () => {
    try {
      setRegisteredEventsLoading(true);
      setRegisteredEventsError("");
      try {
        const supaUser = await getCurrentUser();
        if (!supaUser) { setRegisteredEvents([]); return; }
        const regs = await getUserEventRegistrations(supaUser.id);
        if (!isMountedRef.current) return;
        setRegisteredEvents(Array.isArray(regs) ? regs : []);
      } catch (error) {
        if (isMountedRef.current) {
          setRegisteredEventsError("Unable to load your registered events right now.");
          setRegisteredEvents([]);
        }
      }
    } finally {
      if (isMountedRef.current) setRegisteredEventsLoading(false);
    }
  }, []);

  const handleRefreshEvents = React.useCallback(async () => {
    await Promise.all([fetchEvents({ showRefreshingState: true }), fetchRegistrations()]);
  }, [fetchEvents, fetchRegistrations]);

  const openEvent = (event) => {
    const parentNavigator = navigation.getParent?.();
    const rootNavigator = parentNavigator?.getParent?.();
    if (rootNavigator?.navigate) { rootNavigator.navigate("ViewEventsScreen", { event }); return; }
    if (parentNavigator?.navigate) { parentNavigator.navigate("ViewEventsScreen", { event }); return; }
    navigation.navigate("ViewEventsScreen", { event });
  };

  const openRegisteredEvent = (registration) => {
    const registeredEvent = registration?.event;
    const fullEventFromList = events.find((event) => Number(event?.id) === Number(registeredEvent?.id)) ?? null;
    const eventToOpen = fullEventFromList ?? registeredEvent;
    const normalizedRegisteredEvent = registeredEvent ? { ...eventToOpen, cover_image_url: eventToOpen?.cover_image_url ?? eventToOpen?.images?.[0]?.image_path ?? null } : null;
    if (!normalizedRegisteredEvent?.id) return;

    const parentNavigator = navigation.getParent?.();
    const rootNavigator = parentNavigator?.getParent?.();
    if (rootNavigator?.navigate) { rootNavigator.navigate("ViewEventsScreen", { event: normalizedRegisteredEvent }); return; }
    if (parentNavigator?.navigate) { parentNavigator.navigate("ViewEventsScreen", { event: normalizedRegisteredEvent }); return; }
    navigation.navigate("ViewEventsScreen", { event: normalizedRegisteredEvent });
  };

  React.useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useFocusEffect(React.useCallback(() => { fetchRegistrations(); }, [fetchRegistrations]));

  const animateMonthChange = (direction) => {
    if (isMonthAnimatingRef.current) return;
    isMonthAnimatingRef.current = true;
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
    setSelectedCalendarDay(null);

    Animated.timing(monthFadeAnimation, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { isMonthAnimatingRef.current = false; return; }
      setCurrentDate(nextDate);
      monthFadeAnimation.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(monthFadeAnimation, { toValue: 1, duration: 190, useNativeDriver: true }).start(() => { isMonthAnimatingRef.current = false; });
      });
    });
  };

  const goToPreviousMonth = () => animateMonthChange(-1);
  const goToNextMonth = () => animateMonthChange(1);

  const calendarPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 8,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) { animateMonthChange(1); return; }
        if (gestureState.dx > 40) { animateMonthChange(-1); return; }
      },
    }),
  ).current;

  const renderEventCard = (event) => {
    const imageSource = event.cover_image_url ? { uri: event.cover_image_url } : require("../../assets/icons/Group.png");
    return (
      <Pressable
        key={`event-${event.id}`}
        style={({ pressed }) => [styles.eventCard, pressed ? styles.eventCardPressed : null]}
        onPress={() => openEvent(event)}
      >
        <Image source={imageSource} style={styles.cardImage} resizeMode={event.cover_image_url ? "cover" : "contain"} />
        <View style={styles.cardContent}>
          <Text numberOfLines={2} style={styles.cardTitle}>{event.title}</Text>
          <View style={styles.cardMetaRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text numberOfLines={1} style={styles.cardMetaText}>{formatEventDateRange(event.start_date, event.end_date)}</Text>
          </View>
          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text numberOfLines={1} style={styles.cardMetaText}>{getEventLocationLabel(event)}</Text>
          </View>
          <TouchableOpacity style={styles.preRegisterBtn} onPress={() => openEvent(event)} activeOpacity={0.85}>
            <Text style={styles.preRegisterBtnText}>Pre-Register Now!</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  return (
    
      <View style={styles.container}>
        <HomeHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshingEvents} onRefresh={handleRefreshEvents} tintColor="#FFFFFF" colors={["#31429B"]} />}
        >
          {/* YELLOW BANNER ACTIONS */}
          <View style={styles.yellowBanner}>
            <TouchableOpacity style={styles.bannerActionRow} onPress={openCalendar} activeOpacity={0.8}>
              <Ionicons name="calendar" size={24} color="#31429B" />
              <Text style={styles.bannerActionText}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerActionRow} onPress={openRegistrations} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={24} color="#31429B" />
              <Text style={styles.bannerActionText}>My Registrations</Text>
            </TouchableOpacity>
          </View>

          {/* WHITE HERO SECTION */}
          <View style={styles.whiteHeroSection}>
            <Text style={styles.heroHeading}>Explore All University{"\n"}Events and Activities!</Text>
            
            <Image 
              source={require("../../assets/images/DiscountsPerks_Image 2 (1).png")} 
              style={styles.heroIllustration} 
              resizeMode="contain" 
            />

            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* DARK BLUE EVENTS SECTION */}
          <View style={styles.blueEventsSection}>
            <Text style={styles.sectionTitleYellow}>Events For You!</Text>
            
            {eventsLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#FFD404" />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : visibleFeaturedItems.length > 0 ? (
              <View style={styles.cardsGrid}>
                {visibleFeaturedItems.map(renderEventCard)}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No events found.</Text>
                <Text style={styles.emptyStateText}>{eventsError || "Check back later for new events."}</Text>
              </View>
            )}

            {visibleFeaturedItems.length > 0 && (
              <TouchableOpacity style={styles.viewAllOutlineButton}>
                <Text style={styles.viewAllOutlineText}>View All</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitleYellow}>Coming Soon at NU Lipa!</Text>
            
            {eventsLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#FFD404" />
              </View>
            ) : visibleComingSoonItems.length > 0 ? (
              <View style={styles.cardsGrid}>
                {visibleComingSoonItems.map(renderEventCard)}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No upcoming events.</Text>
                <Text style={styles.emptyStateText}>Stay tuned for future announcements.</Text>
              </View>
            )}

            {visibleComingSoonItems.length > 0 && (
              <TouchableOpacity style={styles.viewAllOutlineButton}>
                <Text style={styles.viewAllOutlineText}>View All</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* MODALS */}
          <Modal transparent visible={calendarVisible} animationType="fade" onRequestClose={closeCalendar}>
            <View style={styles.calendarOverlay}>
              <Pressable style={styles.calendarBackdrop} onPress={closeCalendar} />
              <View style={[styles.calendarCard, { width: calendarWidth }]}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.calendarNavButton} onPress={goToPreviousMonth} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={22} color="#31429B" />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>{monthLabel}</Text>
                  <TouchableOpacity style={styles.calendarNavButton} onPress={goToNextMonth} activeOpacity={0.8}>
                    <Ionicons name="chevron-forward" size={22} color="#31429B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarPagerWindow} {...calendarPanResponder.panHandlers}>
                  <Animated.View style={[styles.calendarPagerContent, { width: calendarContentWidth, opacity: monthFadeAnimation }]}>
                    <View style={styles.calendarWeekRow}>
                      {WEEKDAY_LABELS.map((weekday, index) => (
                        <Text key={`${weekday}-${index}`} style={styles.calendarWeekLabel}>{weekday}</Text>
                      ))}
                    </View>
                    <View style={styles.calendarGrid}>
                      {monthDays.map((day, index) => {
                        const isToday = day && new Date().getFullYear() === currentYear && new Date().getMonth() === currentMonth && new Date().getDate() === day;
                        const eventCount = day ? (eventDayCountMap.get(day) ?? 0) : 0;
                        const hasEvent = eventCount > 0;
                        const bubbleAnchorStyle = getCalendarBubbleAnchorStyle(index);

                        return (
                          <View key={`${monthLabel}-${index}`} style={[styles.calendarDayCell, !day && styles.calendarDayCellEmpty]}>
                            {day ? (
                              <>
                                <Pressable
                                  style={[styles.calendarDayBubble, isToday && styles.calendarDayBubbleToday, hasEvent && styles.calendarDayBubbleEvent, isToday && hasEvent && styles.calendarDayBubbleTodayEvent, selectedCalendarDay === day && styles.calendarDayBubbleSelected]}
                                  onPress={() => handleCalendarDayPress(day)}
                                >
                                  <Text style={[styles.calendarDayText, isToday && styles.calendarDayTextToday, hasEvent && styles.calendarDayTextEvent, isToday && hasEvent && styles.calendarDayTextTodayEvent, selectedCalendarDay === day && styles.calendarDayTextSelected]}>
                                    {day}
                                  </Text>
                                  {hasEvent ? <View style={[styles.calendarEventDot, isToday && styles.calendarEventDotToday]} /> : null}
                                </Pressable>
                                {selectedCalendarDay === day && selectedDayEvents.length > 0 ? (
                                  <Animated.View style={[styles.calendarDayEventBubble, bubbleAnchorStyle.bubble, bubbleAnimatedStyle]}>
                                    {selectedCalendarDayEventPreview.map((event) => (
                                      <Pressable key={`calendar-day-bubble-${event.id}`} style={({ pressed }) => [styles.calendarDayEventBubbleItemRow, pressed ? styles.calendarDayEventBubbleItemRowPressed : null]} onPress={() => { closeCalendar(); openEvent(event); }}>
                                        <Image source={event.cover_image_url ? { uri: event.cover_image_url } : require("../../assets/icons/Group.png")} style={styles.calendarDayEventBubbleThumb} resizeMode={event.cover_image_url ? "cover" : "contain"} />
                                        <Text numberOfLines={2} style={styles.calendarDayEventBubbleItem}>{event.title ?? "Event"}</Text>
                                      </Pressable>
                                    ))}
                                    {selectedCalendarDayOverflowCount > 0 ? <Text style={styles.calendarDayEventBubbleMore}>+{selectedCalendarDayOverflowCount} more</Text> : null}
                                    <View style={[styles.calendarDayEventBubbleArrow, bubbleAnchorStyle.arrow]} />
                                  </Animated.View>
                                ) : null}
                              </>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </Animated.View>
                </View>
              </View>
            </View>
          </Modal>

          <Modal transparent visible={registrationsVisible} animationType="fade" onRequestClose={closeRegistrations}>
            <View style={styles.calendarOverlay}>
              <Pressable style={styles.calendarBackdrop} onPress={closeRegistrations} />
              <View style={styles.registrationCard}>
                <View style={styles.registrationHeader}>
                  <Text style={styles.registrationTitle}>Your Pre-Registered Events</Text>
                  <TouchableOpacity style={styles.calendarNavButton} onPress={closeRegistrations} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="#31429B" />
                  </TouchableOpacity>
                </View>

                {registeredEventsLoading ? (
                  <View style={styles.registrationEmptyState}>
                    <ActivityIndicator size="small" color="#31429B" />
                    <Text style={styles.registrationEmptyText}>Loading your registered events...</Text>
                  </View>
                ) : hasPreRegisteredEvents ? (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.registrationList}>
                    {registeredEvents.map((registration) => (
                      <Pressable key={`registered-event-${registration.id}`} style={({ pressed }) => [styles.registrationItem, pressed ? styles.registrationItemPressed : null]} onPress={() => openRegisteredEvent(registration)}>
                        <View style={styles.registrationIconWrap}>
                          <Ionicons name="bookmark" size={18} color="#31429B" />
                        </View>
                        <View style={styles.registrationTextWrap}>
                          <Text style={styles.registrationItemTitle}>{registration.event?.title ?? "Registered Event"}</Text>
                          <Text style={styles.registrationItemMeta}>{formatRegisteredEventDate(registration)} • {getRegisteredEventLocationLabel(registration)}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.registrationEmptyState}>
                    <View style={styles.registrationEmptyIconWrap}>
                      <Image source={require("../../assets/icons/Group.png")} style={styles.registrationEmptyIcon} resizeMode="contain" />
                    </View>
                    <Text style={styles.registrationEmptyText}>{registeredEventsError || "You have no pre-registered events yet."}</Text>
                    <TouchableOpacity style={styles.registrationOkayButton} activeOpacity={0.85} onPress={closeRegistrations}>
                      <Text style={styles.registrationOkayButtonText}>Okay</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>

        </ScrollView>
      </View>
    
  );
};

export default EventsScreen;