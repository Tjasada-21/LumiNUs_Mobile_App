import supabase from "./supabase";

class CallSignalingService {
  constructor() {
    this.channel = null;
  }

  // 1. Both phones join the exact same secure room
  joinCallRoom(callId, userId, onOffer, onAnswer, onIceCandidate) {
    // Prefix the room name so it's unique to this call
    this.channel = supabase.channel(`webrtc_call_${callId}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    // 2. Listen for WebRTC signals from the other phone
    this.channel
      .on("broadcast", { event: "webrtc_signal" }, (payload) => {
        const { senderId, type, data } = payload.payload;

        // Ignore our own echoes
        if (senderId === userId) return;

        if (type === "offer") onOffer(data);
        if (type === "answer") onAnswer(data);
        if (type === "ice_candidate") onIceCandidate(data);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Signaling] Connected to call room ${callId}`);
        }
      });
  }

  // 3. Helper to fire signals across the internet
  async sendSignal(callId, userId, type, data) {
    if (!this.channel) return;

    await this.channel.send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: {
        senderId: userId,
        type: type, // 'offer', 'answer', or 'ice_candidate'
        data: data, // The actual SDP or ICE object
      },
    });
  }

  leaveCallRoom() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export default new CallSignalingService();
