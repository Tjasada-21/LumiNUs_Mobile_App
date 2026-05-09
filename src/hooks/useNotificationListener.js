import { useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';

/**
 * Hook to handle notification responses in screens
 * Automatically navigates or triggers actions based on notification type
 */
export const useNotificationListener = (navigation) => {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        // Handle different notification types
        if (data.screen && navigation) {
          const navigationParams = {};

          switch (data.type) {
            case 'message':
              navigationParams.contactId = data.conversationId;
              break;
            case 'event':
              navigationParams.eventId = data.eventId;
              break;
            case 'announcement':
              navigationParams.announcementId = data.announcementId;
              break;
            case 'perk':
              navigationParams.perkId = data.perkId;
              break;
            case 'reaction':
            case 'comment':
            case 'repost':
              navigationParams.postId = data.postId;
              break;
            default:
              break;
          }

          navigation.navigate(data.screen, navigationParams);
        }
      }
    );

    return () => subscription.remove();
  }, [navigation]);
};

/**
 * Hook to get the current notification state
 */
export const useNotificationState = () => {
  const [lastNotification, setLastNotification] = require('react').useState(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      setLastNotification(response.notification);
    });

    return () => subscription.remove();
  }, []);

  return lastNotification;
};
