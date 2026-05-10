// Master Notification Sender utility
// Sends push messages to Expo Push API in chunks (max 100 per request)

export async function sendPushNotification(expoPushTokens = [], title = '', body = '', data = {}) {
  if (!Array.isArray(expoPushTokens)) expoPushTokens = [];

  // 1. Clean the list (Remove nulls, undefined, or empty tokens)
  const validTokens = expoPushTokens.filter(token => typeof token === 'string' && token.startsWith('ExponentPushToken'));

  if (validTokens.length === 0) {
    return;
  }

  // 2. Format the messages for Expo
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title || '',
    body: body || '',
    data: data || {},
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

      // Silent operation - notifications sent to Expo API
    } catch (error) {
      // Silently handle chunk send errors
    }
  }
}

export default {
  sendPushNotification,
};
