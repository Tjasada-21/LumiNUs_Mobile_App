import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import supabase from "./supabase"; // Adjust this path to your actual Supabase setup

// This tells the app how to behave if a notification arrives WHILE the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // ✅ Shows the drop-down banner while using the app
    shouldShowList: true, // ✅ Keeps it in the notification center
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

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
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    return null;
  }

  // Android specific channel setup
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#31429B", // NU Lipa Blue!
    });
  }

  return token;
}

export async function saveTokenToSupabase(pushToken) {
  if (!pushToken) return;

  try {
    // Get the currently logged in user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Save the token to their profile in your database
    const { error } = await supabase
      .from("alumnis") // ⚠️ Change to your actual table name!
      .update({ push_token: pushToken })
      .eq("email", user.email);

    if (error) throw error;
  } catch (error) {
    // Silently fail if unable to save token
  }
}

// Convenience: export NotificationSender helper for quick in-app calls
export { sendPushNotification } from "./NotificationSender";
