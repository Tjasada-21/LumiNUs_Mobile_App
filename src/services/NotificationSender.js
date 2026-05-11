// Master Notification Sender utility
// Sends push messages to Expo Push API in chunks (max 100 per request)

const isValidExpoPushToken = (token) => {
  if (typeof token !== 'string') {
    return false;
  }

  return /^Expo(nent)?PushToken\[[^\]]+\]$/i.test(token.trim());
};

export async function sendPushNotification(expoPushTokens = [], title = '', body = '', data = {}) {
  if (!Array.isArray(expoPushTokens)) expoPushTokens = [];

  // 1. Clean and dedupe tokens.
  const validTokens = Array.from(
    new Set(
      expoPushTokens
        .map((token) => (typeof token === 'string' ? token.trim() : token))
        .filter(isValidExpoPushToken)
    )
  );

  if (validTokens.length === 0) {
    return;
  }

  // 2. Format the messages for Expo.
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title || '',
    body: body || '',
    data: data || {},
    // include image for rich notifications where supported
    ...(data && data.image ? { image: data.image } : {}),
  }));

  // 3. Chunk into groups of 100 (Expo limit)
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);

    try {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    } catch (error) {
      // Silently handle send errors
    }
  }
}

export default {
  sendPushNotification,
};
