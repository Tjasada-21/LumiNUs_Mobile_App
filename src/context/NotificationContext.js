import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import notificationService from '../services/notificationService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  // Initialize notifications on app start
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Request permissions
        const permissionGranted = await notificationService.requestPermissions();
        setIsPermissionGranted(permissionGranted);

        if (permissionGranted) {
          // Get push token
          const token = await notificationService.getPushToken();
          if (token) {
            setPushToken(token);
            // Save token to backend
            await notificationService.savePushTokenToBackend(token);
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      notificationService.cleanup();
    };
  }, []);

  const sendNotification = useCallback(async (title, body, data = {}) => {
    try {
      if (isPermissionGranted) {
        await notificationService.sendLocalNotification(title, body, data);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isPermissionGranted]);

  const value = {
    isPermissionGranted,
    pushToken,
    sendNotification,
    notificationService,
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
