import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  NativeModules,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { ThemedAlert } from "../components/ThemedAlert";

const IncomingCallScreen = ({ route, navigation }) => {
  // These should be passed via the Push Notification payload or your real-time listener
  const params = route?.params ?? {};
  const callId = params.callId ?? null;
  const callerId = params.callerId ?? null;
  const callType = params.callType ?? params.type ?? "video";

  const [callerProfile, setCallerProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(
    route?.params?.currentUserId ?? null,
  );

  useEffect(() => {
    let channel;

    // 1. Fetch the Caller's Avatar and Name
    const fetchCallerInfo = async () => {
      const { data, error } = await supabase
        .from("alumnis")
        .select("first_name, last_name, alumni_photo")
        .eq("id", callerId)
        .single();

      if (!error && data) {
        setCallerProfile(data);
      }
    };

    fetchCallerInfo();

    const loadCurrentUser = async () => {
      if (currentUserId) return;

      const currentUser = await getCurrentUser().catch(() => null);
      if (currentUser?.id) {
        setCurrentUserId(currentUser.id);
      }
    };

    loadCurrentUser();

    // 2. Listen to see if the caller hangs up before we answer!
    channel = supabase
      .channel(`call_status_${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          if (
            payload.new.status === "missed" ||
            payload.new.status === "completed"
          ) {
            navigation.goBack(); // The caller gave up, dismiss the screen
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [callId, callerId, currentUserId, navigation]);

  const handleAccept = async () => {
    if (!currentUserId) {
      navigation.goBack();
      return;
    }

    if (!NativeModules?.WebRTCModule) {
      ThemedAlert.alert(
        "Call unavailable",
        "WebRTC is not available in this build. Please use a development client or a custom build.",
      );
      return;
    }

    // 1. Tell Supabase the call is connecting
    await supabase
      .from("calls")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", callId);

    // 2. Teleport to the WebRTC Call Screen as the Receiver!
    navigation.replace("CallScreen", {
      callId: callId,
      currentUserId: currentUserId,
      isCaller: false, // <-- Critical! Tells the hook to wait for the Offer
      type: callType,
    });
  };

  const handleDecline = async () => {
    // 1. Tell Supabase the call was rejected
    await supabase
      .from("calls")
      .update({ status: "rejected", ended_at: new Date().toISOString() })
      .eq("id", callId);

    // 2. Dismiss the screen
    navigation.goBack();
  };

  const callerName = callerProfile
    ? `${callerProfile.first_name} ${callerProfile.last_name}`
    : "Unknown Caller";

  const avatarUri = callerProfile?.alumni_photo
    ? { uri: callerProfile.alumni_photo }
    : require("../../assets/images/unnamed.png"); // Fallback avatar

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.callTypeSubtitle}>
          Incoming {callType === "video" ? "Video" : "Voice"} Call
        </Text>
        <Text style={styles.callerName}>{callerName}</Text>
      </View>

      <View style={styles.middleSection}>
        <View style={styles.avatarGlow}>
          <Image source={avatarUri} style={styles.avatar} />
        </View>
      </View>

      <View style={styles.bottomSection}>
        {/* Decline Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <Ionicons
              name="call"
              size={32}
              color="#FFFFFF"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
          <Text style={styles.buttonLabel}>Decline</Text>
        </View>

        {/* Accept Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Ionicons
              name={callType === "video" ? "videocam" : "call"}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.buttonLabel}>Accept</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111", // Deep dark theme for incoming calls
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    marginTop: 60,
  },
  callTypeSubtitle: {
    fontSize: 16,
    color: "#A0A0A0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  callerName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  middleSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarGlow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    // Optional: Add shadow/glow effects here if you want it to look like it's pulsing
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "#31429B",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  buttonWrapper: {
    alignItems: "center",
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  declineButton: {
    backgroundColor: "#EF4444", // Red
  },
  acceptButton: {
    backgroundColor: "#22C55E", // Green
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default IncomingCallScreen;
