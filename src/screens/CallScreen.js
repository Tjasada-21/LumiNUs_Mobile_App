import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { RTCView } from "react-native-webrtc";
import { Ionicons } from "@expo/vector-icons";
import { useWebRTC } from "../hooks/useWebRTC";
import CallSignalingService from "../services/callSignalingService";
import supabase from "../services/supabase";

const CallScreen = ({ route, navigation }) => {
  // Assume we passed the callId, currentUserId, and if they are the caller via navigation params
  const { callId, currentUserId, isCaller } = route.params;
  const [isMuted, setIsMuted] = useState(false);
  const offerSentRef = useRef(false);

  const {
    localStream,
    remoteStream,
    startLocalStream,
    setupWebrtc,
    createOffer,
    handleReceiveOffer,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    hangUp,
  } = useWebRTC(callId, currentUserId);

  useEffect(() => {
    let statusChannel = null;
    let isActive = true;

    const sendCallerOffer = async () => {
      if (offerSentRef.current || !isActive) return;
      offerSentRef.current = true;
      await createOffer();
    };

    const initCall = async () => {
      // 1. Turn on the camera
      const stream = await startLocalStream();
      if (!stream) return;

      // 2. Prep the WebRTC engine
      setupWebrtc(stream);

      // 3. Join the Supabase Realtime channel
      CallSignalingService.joinCallRoom(
        callId,
        currentUserId,
        handleReceiveOffer,
        handleReceiveAnswer,
        handleReceiveIceCandidate,
      );

      // 4. If we initiated the call, wait until the callee accepts before sending the Offer.
      if (isCaller) {
        const { data: callRow, error } = await supabase
          .from("calls")
          .select("status")
          .eq("id", callId)
          .single();

        if (!error && callRow?.status === "in_progress") {
          await sendCallerOffer();
          return;
        }

        statusChannel = supabase
          .channel(`call_status_caller_${callId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "calls",
              filter: `id=eq.${callId}`,
            },
            async (payload) => {
              if (payload.new.status === "in_progress") {
                await sendCallerOffer();
              }
            },
          )
          .subscribe();
      }
    };

    initCall();

    return () => {
      isActive = false;
      if (statusChannel) {
        supabase.removeChannel(statusChannel);
      }
      hangUp();
    };
  }, [
    callId,
    currentUserId,
    createOffer,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    handleReceiveOffer,
    hangUp,
    isCaller,
    setupWebrtc,
    startLocalStream,
  ]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const endCall = () => {
    hangUp();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Remote Video (Full Screen) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.connectingWrap}>
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}

      {/* Local Video (Floating Picture-in-Picture) */}
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
          zOrder={1}
        />
      )}

      {/* Call Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Ionicons
            name="call"
            size={28}
            color="#FFFFFF"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  remoteVideo: { flex: 1 },
  connectingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  connectingText: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  localVideo: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#333",
    overflow: "hidden",
  },
  controlsRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  endCallButton: {
    backgroundColor: "#EF4444",
  },
});

export default CallScreen;
