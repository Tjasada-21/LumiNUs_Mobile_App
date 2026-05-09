import * as SecureStore from 'expo-secure-store';
import supabase from './supabase';

let sessionToken = null;
let sessionEmail = null;
let rememberSession = false;
let tokenLoadPromise = null;

export const setAuthCredentials = async ({ token, email, remember }) => {
  sessionToken = token ?? null;
  sessionEmail = email ?? null;
  rememberSession = Boolean(remember);

  if (rememberSession) {
    if (sessionToken) {
      await SecureStore.setItemAsync('userToken', sessionToken);
    } else {
      await SecureStore.deleteItemAsync('userToken');
    }

    if (sessionEmail) {
      await SecureStore.setItemAsync('userEmail', sessionEmail);
    } else {
      await SecureStore.deleteItemAsync('userEmail');
    }
  } else {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userEmail');
  }
};

export const getAuthToken = async () => {
  // 1. Prefer Supabase session token
  try {
    if (sessionToken) return sessionToken;

    if (supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      const accessToken = session?.access_token ?? null;
      if (accessToken) {
        sessionToken = accessToken;
        return accessToken;
      }
    }
  } catch (e) {
    // ignore and fallback to SecureStore
  }

  // 2. Fallback to stored token
  if (tokenLoadPromise) return tokenLoadPromise;

  tokenLoadPromise = SecureStore.getItemAsync('userToken').then((storedToken) => {
    if (storedToken) sessionToken = storedToken;
    return storedToken;
  }).finally(() => { tokenLoadPromise = null; });

  return tokenLoadPromise;
};

export const peekAuthToken = () => sessionToken;

export const preloadAuthToken = () => {
  if (sessionToken) return Promise.resolve(sessionToken);
  return getAuthToken();
};

export const getAuthEmail = async () => {
  // Prefer Supabase user email
  try {
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (user?.email) return user.email;
    }
  } catch (e) {
    // ignore
  }

  if (sessionEmail) return sessionEmail;
  const storedEmail = await SecureStore.getItemAsync('userEmail');
  if (storedEmail) sessionEmail = storedEmail;
  return storedEmail;
};

export const isRememberedSession = () => rememberSession;

export const clearAuthCredentials = async () => {
  sessionToken = null;
  sessionEmail = null;
  rememberSession = false;
  tokenLoadPromise = null;

  try {
    if (supabase) await supabase.auth.signOut();
  } catch (e) {
    // ignore
  }

  await SecureStore.deleteItemAsync('userToken');
  await SecureStore.deleteItemAsync('userEmail');
};
