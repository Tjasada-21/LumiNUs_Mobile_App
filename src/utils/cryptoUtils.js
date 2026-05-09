// 🚀 THE FIX: Use the React Native specific version!
import CryptoJS from 'react-native-crypto-js';

const SECRET_KEY = process.env.EXPO_PUBLIC_MESSAGE_SECRET || 'fallback-secret-key';
const ENCRYPTED_PREFIX = 'enc:';
const LEGACY_OPENSSL_PREFIX = 'U2FsdGVkX1';

export const encryptMessage = (rawText) => {
  if (!rawText) return '';
  const payload = CryptoJS.AES.encrypt(rawText, SECRET_KEY).toString();
  return `${ENCRYPTED_PREFIX}${payload}`;
};

export const decryptMessage = (cipherText) => {
  if (!cipherText) return '';

  const input = String(cipherText);

  // If this is plain text (not an encrypted payload), return as-is.
  if (!input.startsWith(ENCRYPTED_PREFIX) && !input.startsWith(LEGACY_OPENSSL_PREFIX)) {
    return input;
  }

  try {
    const payload = input.startsWith(ENCRYPTED_PREFIX)
      ? input.slice(ENCRYPTED_PREFIX.length)
      : input;

    const bytes = CryptoJS.AES.decrypt(payload, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    return originalText || '[Unreadable Message]'; 
  } catch (_error) {
    return '[Encrypted]';
  }
};