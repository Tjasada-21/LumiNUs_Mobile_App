import * as SecureStore from 'expo-secure-store';

const KEY = 'apiBaseUrlOverride';

export const setBaseUrlOverride = async (url) => {
  if (!url) {
    await SecureStore.deleteItemAsync(KEY);
    return null;
  }

  await SecureStore.setItemAsync(KEY, String(url));
  return url;
};

export const getBaseUrlOverride = async () => {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v;
  } catch (e) {
    return null;
  }
};

export const clearBaseUrlOverride = async () => {
  await SecureStore.deleteItemAsync(KEY);
};

export default {
  setBaseUrlOverride,
  getBaseUrlOverride,
  clearBaseUrlOverride,
};
