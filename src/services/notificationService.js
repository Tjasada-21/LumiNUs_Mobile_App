import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import supabase from "./supabase";

// Set notification handler for all platforms
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Android specific channel setup
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#31429B",
    });
  }

  // Only request push tokens on physical devices to prevent simulator crashes
  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log('[notificationService] Failed to get push token permissions!');
        return null;
      }

      // Get the unique token for this specific device.
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
      console.log('[notificationService] Error registering:', error.message);
      return null;
    }
  } else {
    console.log('[notificationService] Must use a physical device for Push Notifications');
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