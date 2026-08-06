import { Platform } from "react-native";
import Constants from "expo-constants";
import supabase from "./supabase";

// Only import notifications on Android
let Notifications = null;
if (Platform.OS === 'android') {
  try {
    Notifications = require("expo-notifications");
    
    // Set notification handler ONLY on Android
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.log('[notificationService] Notifications not available');
  }
}

export async function registerForPushNotificationsAsync() {
  // Skip on iOS Expo Go
  if (Platform.OS === 'ios' || !Notifications) {
    console.log('[notificationService] Push notifications not available on this platform');
    return null;
  }

  let token;

  try {
    // Check existing permissions first.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // Get the unique token for this specific device.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Android specific channel setup
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#31429B",
      });
    }
  } catch (error) {
    console.log('[notificationService] Error registering:', error.message);
    return null;
  }

  return token;
}

export async function saveTokenToSupabase(pushToken) {
  if (!pushToken) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("alumnis")
      .update({ push_token: pushToken })
      .eq("email", user.email);

    if (error) throw error;
  } catch (error) {
    // Silently fail if unable to save token
  }
}

export { sendPushNotification } from "./NotificationSender";