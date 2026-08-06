import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Platform } from "react-native";

// Only import notification services on Android
let Notifications = null;
let notificationService = null;
let announcementNotifier = null;
let eventNotifier = null;

if (Platform.OS === 'android') {
  try {
    Notifications = require("expo-notifications");
    notificationService = require("../services/notificationService");
    announcementNotifier = require("../services/announcementNotifier");
    eventNotifier = require("../services/eventNotifier");
  } catch (e) {
    console.log('[NotificationContext] Services not available:', e.message);
  }
}

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  // Initialize notifications on app start
  useEffect(() => {
    // Skip entirely on iOS Expo Go
    if (Platform.OS === 'ios' || !notificationService) {
      console.log('[NotificationContext] Notifications disabled on this platform');
      return;
    }

    const initializeNotifications = async () => {
      try {
        const { registerForPushNotificationsAsync, saveTokenToSupabase } = notificationService;
        const token = await registerForPushNotificationsAsync();
        setIsPermissionGranted(Boolean(token));

        if (token) {
          setPushToken(token);
          await saveTokenToSupabase(token);
        }
      } catch (error) {
        console.log('[NotificationContext] Init error:', error.message);
      }
    };

    initializeNotifications();

    // Start listening for new announcements and events
    let stopAnnouncements = null;
    let stopEvents = null;

    (async () => {
      try {
        if (announcementNotifier && eventNotifier) {
          const { startAnnouncementNotifier } = announcementNotifier;
          const { startEventNotifier } = eventNotifier;
          
          [stopAnnouncements, stopEvents] = await Promise.all([
            startAnnouncementNotifier(),
            startEventNotifier(),
          ]);
        }
      } catch (error) {
        console.log('[NotificationContext] Notifier error:', error.message);
      }
    })();

    // Cleanup
    return () => {
      if (stopAnnouncements) stopAnnouncements();
      if (stopEvents) stopEvents();
    };
  }, []);

  const sendNotification = useCallback(
    async (title, body, data = {}) => {
      // Skip on iOS Expo Go
      if (Platform.OS === 'ios' || !Notifications) {
        console.log('[NotificationContext] Notification skipped on this platform');
        return;
      }

      try {
        if (isPermissionGranted) {
          await Notifications.scheduleNotificationAsync({
            content: { title, body, data },
            trigger: null,
          });
        }
      } catch (error) {
        console.log('[NotificationContext] Send error:', error.message);
      }
    },
    [isPermissionGranted],
  );

  const value = {
    isPermissionGranted: Platform.OS === 'android' ? isPermissionGranted : false,
    pushToken: Platform.OS === 'android' ? pushToken : null,
    sendNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
};