// Master Notification Sender utility
// Sends push messages to Expo Push API in chunks (max 100 per request)

export async function sendPushNotification(expoPushTokens = [], title = '', body = '', data = {}) {
  if (!Array.isArray(expoPushTokens)) expoPushTokens = [];

  // 1. Clean the list (Remove nulls, undefined, or empty tokens)
  const validTokens = expoPushTokens.filter(token => typeof token === 'string' && token.startsWith('ExponentPushToken'));

  if (validTokens.length === 0) {
    console.log('[NotificationSender] No valid push tokens to send to.');
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

      const responseBody = await resp.text().catch(() => '');
      let parsed = null;
      try {
        parsed = responseBody ? JSON.parse(responseBody) : null;
      } catch (err) {
        // not JSON
      }

      if (!resp.ok) {
        console.error(`[NotificationSender] Failed to send chunk (status ${resp.status}):`, parsed || responseBody || resp.statusText);
      } else {
        // log summary of results (don't print tokens)
        if (parsed && parsed.data) {
          console.log(`[NotificationSender] Sent chunk: ${chunk.length} items.`, {
            id: parsed.data[0]?.id ?? null,
            status: resp.status,
          });
        } else {
          console.log(`[NotificationSender] Successfully sent ${chunk.length} notifications.`);
        }
      }
    } catch (error) {
      console.error('[NotificationSender] Error sending push notification chunk:', error);
    }
  }
}

export default {
  sendPushNotification,
};
