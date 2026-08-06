import { Platform, Alert, View } from 'react-native';
import { isWebRTCAvailable, RTCPeerConnection, RTCView } from '../services/webrtc';

export default function VideoCallScreen() {
  // Check if WebRTC is available
  if (!isWebRTCAvailable()) {
    return (
      <View>
        <Text>Video calls are only available on Android</Text>
      </View>
    );
  }

  // Your WebRTC video call logic here
  // This will only run on Android (dev build)
  return (
    <RTCView streamURL={localStream.toURL()} />
  );
}