import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, saveTokenToSupabase } from '../services/notificationService';
import { startAnnouncementNotifier } from '../services/announcementNotifier';
import { startEventNotifier } from '../services/eventNotifier';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  // Initialize notifications on app start
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        setIsPermissionGranted(Boolean(token));

        if (token) {
          setPushToken(token);
          await saveTokenToSupabase(token);
        }
      } catch (error) {
        // Silently handle notification initialization errors
      }
    };

    initializeNotifications();

    // Start listening for new announcements and events
    let stopAnnouncements = null;
    let stopEvents = null;

    (async () => {
      try {
        [stopAnnouncements, stopEvents] = await Promise.all([
          startAnnouncementNotifier(),
          startEventNotifier(),
        ]);
      } catch (error) {
        // Silently handle initialization errors
      }
    })();

    // Cleanup
    return () => {
      if (stopAnnouncements) stopAnnouncements();
      if (stopEvents) stopEvents();
    };
  }, []);

  const sendNotification = useCallback(async (title, body, data = {}) => {
    try {
      if (isPermissionGranted) {
        await Notifications.scheduleNotificationAsync({
          content: { title, body, data },
          trigger: null,
        });
      }
    } catch (error) {
      // Silently handle send errors
    }
  }, [isPermissionGranted]);

  const value = {
    isPermissionGranted,
    pushToken,
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
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
