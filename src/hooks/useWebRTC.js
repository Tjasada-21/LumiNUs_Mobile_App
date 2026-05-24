    import { useState, useRef, useCallback } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import CallSignalingService from '../services/callSignalingService';

// Google's free STUN servers to find our public IP
const peerConstraints = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (callId, currentUserId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

  const startLocalStream = async () => {
    try {
      // 1. Ask the phone for camera and microphone permissions
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720, frameRate: 30, facingMode: 'user' },
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      return null;
    }
  };

  const setupWebrtc = useCallback((stream) => {
    // 2. Create the P2P connection engine
    peerConnection.current = new RTCPeerConnection(peerConstraints);

    // 3. Feed our local camera to the engine so it can be sent
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    // 4. Listen for the other person's video arriving
    peerConnection.current.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // 5. Trickle ICE: Every time we find a path through the firewall, send it to Supabase!
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        CallSignalingService.sendSignal(callId, currentUserId, 'ice_candidate', event.candidate);
      }
    };
  }, [callId, currentUserId]);

  // --- SIGNALING DANCE ---

  const createOffer = async () => {
    const offer = await peerConnection.current.createOffer({});
    await peerConnection.current.setLocalDescription(offer);
    // Send our offer through Supabase Broadcast
    CallSignalingService.sendSignal(callId, currentUserId, 'offer', offer);
  };

  const handleReceiveOffer = async (offer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    // Reply with our answer through Supabase Broadcast
    CallSignalingService.sendSignal(callId, currentUserId, 'answer', answer);
  };

  const handleReceiveAnswer = async (answer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleReceiveIceCandidate = async (candidate) => {
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding ICE candidate', e);
    }
  };

  const hangUp = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection.current) peerConnection.current.close();
    setLocalStream(null);
    setRemoteStream(null);
    CallSignalingService.leaveCallRoom();
  };

  return {
    localStream,
    remoteStream,
    startLocalStream,
    setupWebrtc,
    createOffer,
    handleReceiveOffer,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    hangUp
  };
};