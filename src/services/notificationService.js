import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import { getAuthToken } from './authStorage';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.token = null;
    this.responseListener = null;
  }

  /**
   * Remote push tokens are not supported in Expo Go for SDK 53+
   */
  isExpoGo() {
    return Constants?.executionEnvironment === 'storeClient';
  }

  /**
   * Resolve Expo projectId and ensure it is a UUID before sending it to Expo API
   */
  getExpoProjectId() {
    const projectId =
      Constants?.easConfig?.projectId ||
      Constants?.expoConfig?.extra?.expoProjectId ||
      Constants?.expoConfig?.extra?.eas?.projectId ||
      null;

    if (!projectId) {
      return null;
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return uuidPattern.test(projectId) ? projectId : null;
  }

  /**
   * Android push token fetch requires FCM configuration in the Expo manifest.
   */
  hasAndroidFcmConfig() {
    if (Platform.OS !== 'android') {
      return true;
    }

    return Boolean(Constants?.expoConfig?.android?.googleServicesFile);
  }

  /**
   * Request push notification permissions
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push notification permissions');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get push notification token
   */
  async getPushToken() {
    try {
      if (this.isExpoGo()) {
        console.warn(
          'Skipping remote push token: Expo Go does not support Android remote push notifications in SDK 53+. Use a development build.'
        );
        return null;
      }

      if (Platform.OS === 'android' && !this.hasAndroidFcmConfig()) {
        console.warn(
          'Skipping remote push token: Android FCM is not configured. Add google-services.json and set expo.android.googleServicesFile in app.json.'
        );
        return null;
      }

      const projectId = this.getExpoProjectId();
      if (!projectId) {
        console.warn(
          'Skipping remote push token: no valid Expo EAS projectId found. Set expo.extra.eas.projectId (UUID) in app config.'
        );
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      this.token = token.data;
      return this.token;
    } catch (error) {
      const message = String(error?.message || error || '');

      if (message.includes('FirebaseApp is not initialized')) {
        console.warn(
          'Skipping remote push token: FirebaseApp is not initialized. Configure Android FCM credentials before requesting push tokens.'
        );
        return null;
      }

      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Save push token to backend
   */
  async savePushTokenToBackend(pushToken) {
    if (!pushToken) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      await api.post(
        '/notifications/register-device',
        { push_token: pushToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error saving push token to backend:', error);
    }
  }

  /**
   * Send local test notification
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Create notification from event
   */
  createEventNotification(event) {
    return {
      title: `New Event: ${event.title}`,
      body: event.description || 'A new event has been created',
      data: {
        type: 'event',
        eventId: event.id,
        screen: 'EventDetailsScreen',
      },
    };
  }

  /**
   * Create notification from announcement
   */
  createAnnouncementNotification(announcement) {
    return {
      title: 'New Announcement',
      body: announcement.content || 'You have a new announcement',
      data: {
        type: 'announcement',
        announcementId: announcement.id,
        screen: 'HomeScreen',
      },
    };
  }

  /**
   * Create notification from message
   */
  createMessageNotification(message) {
    const senderName = message.sender?.name || message.sender_name || 'Someone';
    return {
      title: `New Message from ${senderName}`,
      body: message.content || 'You have a new message',
      data: {
        type: 'message',
        messageId: message.id,
        conversationId: message.conversation_id || message.contact_id,
        screen: 'ConvoScreen',
      },
    };
  }

  /**
   * Create notification from perk
   */
  createPerkNotification(perk) {
    return {
      title: 'New Perk Available',
      body: perk.title || 'You have a new perk available',
      data: {
        type: 'perk',
        perkId: perk.id,
        screen: 'PerksScreen',
      },
    };
  }

  /**
   * Create notification from reaction
   */
  createReactionNotification(reaction) {
    const userName = reaction.user?.name || reaction.user_name || 'Someone';
    return {
      title: `${userName} reacted to your post`,
      body: `${reaction.reaction} ${reaction.post?.content?.substring(0, 30) || 'your post'}...`,
      data: {
        type: 'reaction',
        reactionId: reaction.id,
        postId: reaction.post_id,
        screen: 'UserFeedScreen',
      },
    };
  }

  /**
   * Create notification from comment
   */
  createCommentNotification(comment) {
    const userName = comment.user?.name || comment.user_name || 'Someone';
    return {
      title: `${userName} commented on your post`,
      body: comment.content?.substring(0, 50) || 'Added a comment',
      data: {
        type: 'comment',
        commentId: comment.id,
        postId: comment.post_id,
        screen: 'UserFeedScreen',
      },
    };
  }

  /**
   * Create notification from repost
   */
  createRepostNotification(repost) {
    const userName = repost.user?.name || repost.user_name || 'Someone';
    return {
      title: `${userName} reposted your post`,
      body: repost.post?.content?.substring(0, 50) || 'Reposted your post',
      data: {
        type: 'repost',
        repostId: repost.id,
        postId: repost.post_id,
        screen: 'UserFeedScreen',
      },
    };
  }

  /**
   * Initialize notification listeners
   */
  setupNotificationListeners(onNotificationReceived) {
    // Handle notifications when app is in foreground
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notification = response.notification;
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );
  }

  /**
   * Clean up notification listeners
   */
  cleanup() {
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
