import { Platform } from 'react-native';

let WebRTC = null;

// Only load on Android (dev build)
if (Platform.OS === 'android') {
  try {
    WebRTC = require('react-native-webrtc');
  } catch (e) {
    console.log('WebRTC not available:', e.message);
  }
}

// Mock for Expo Go on iOS
const MockWebRTC = {
  RTCPeerConnection: class {
    constructor() { console.log('[Mock] RTCPeerConnection'); }
    close() {}
    addEventListener() {}
    removeEventListener() {}
  },
  RTCSessionDescription: class {},
  RTCIceCandidate: class {},
  RTCView: () => null,
  mediaDevices: {
    getUserMedia: async () => {
      console.warn('[Mock] getUserMedia - not available in Expo Go');
      throw new Error('WebRTC not available in Expo Go');
    }
  },
  registerGlobals: () => console.log('[Mock] registerGlobals'),
};

export const mediaDevices = WebRTC?.mediaDevices || MockWebRTC.mediaDevices;
export const RTCPeerConnection = WebRTC?.RTCPeerConnection || MockWebRTC.RTCPeerConnection;
export const RTCView = WebRTC?.RTCView || MockWebRTC.RTCView;
export const RTCSessionDescription = WebRTC?.RTCSessionDescription || MockWebRTC.RTCSessionDescription;
export const RTCIceCandidate = WebRTC?.RTCIceCandidate || MockWebRTC.RTCIceCandidate;

export const isWebRTCAvailable = () => {
  return Platform.OS === 'android' && WebRTC !== null;
};