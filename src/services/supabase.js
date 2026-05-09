// CRITICAL: Import URL polyfill BEFORE Supabase client creation
// This ensures fetch/URL APIs work properly in React Native
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { diagnoseEnvironment, verifySupabaseClient } from './envDiagnostics';

const SECURESTORE_CHUNK_SIZE = 1800;
const chunkMetaKey = (key) => `${key}__chunk_count`;
const chunkKey = (key, index) => `${key}__chunk_${index}`;

const splitIntoChunks = (value, chunkSize = SECURESTORE_CHUNK_SIZE) => {
  const text = String(value ?? '');
  const chunks = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
};

const readChunkedSecureValue = async (key) => {
  const countRaw = await SecureStore.getItemAsync(chunkMetaKey(key));
  const chunkCount = Number(countRaw);

  if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
    return null;
  }

  const chunkReads = Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index)));
  const chunkValues = await Promise.all(chunkReads);

  if (chunkValues.some((value) => typeof value !== 'string')) {
    return null;
  }

  return chunkValues.join('');
};

const removeChunkedSecureValue = async (key) => {
  const countRaw = await SecureStore.getItemAsync(chunkMetaKey(key));
  const chunkCount = Number(countRaw);

  if (Number.isFinite(chunkCount) && chunkCount > 0) {
    const chunkDeletes = Array.from({ length: chunkCount }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index)));
    await Promise.all(chunkDeletes);
  }

  await SecureStore.deleteItemAsync(chunkMetaKey(key));
};

// Resolve AsyncStorage with a safe fallback to SecureStore when the community
// package isn't installed. This avoids Metro bundler errors on Android/iOS.
let AsyncStorageImpl = null;
try {
  // Use require to allow graceful failure during bundling if the module is missing
  // and avoid crashing the static import resolution.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorageImpl = mod?.default ?? mod;
} catch (e) {
  console.warn('[supabase] @react-native-async-storage/async-storage not found; falling back to expo-secure-store');
  AsyncStorageImpl = {
    getItem: async (key) => {
      try {
        const directValue = await SecureStore.getItemAsync(key);
        if (typeof directValue === 'string') {
          return directValue;
        }

        return await readChunkedSecureValue(key);
      } catch (err) {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        const safeValue = String(value ?? '');

        await removeChunkedSecureValue(key);

        if (safeValue.length <= SECURESTORE_CHUNK_SIZE) {
          await SecureStore.setItemAsync(key, safeValue);
          return null;
        }

        const chunks = splitIntoChunks(safeValue);
        await SecureStore.deleteItemAsync(key);
        await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
        await SecureStore.setItemAsync(chunkMetaKey(key), String(chunks.length));
        return null;
      } catch (err) {
        return null;
      }
    },
    removeItem: async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
        await removeChunkedSecureValue(key);
        return null;
      } catch (err) {
        return null;
      }
    },
  };
}

// Load environment variables from .env file
// process.env is populated by Expo from .env file at build time
// If not available, use hardcoded fallback values
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pmnirrvwibzqjlutbnwz.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbmlycnZ3aWJ6cWpsdXRibnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI0MzAwNDgsImV4cCI6MTkwODY5NzA0OH0.WoJBaLWvQy_0nMKLe4hVTvWJVLNQUKIHxfSZGFVQZEY';

// Log env var loading for debugging
if (__DEV__) {
  // console.log('[supabase] Initializing Supabase client...');
  // console.log('[supabase] URL loaded:', Boolean(SUPABASE_URL));
  // console.log('[supabase] Key loaded:', Boolean(SUPABASE_ANON_KEY));
  // diagnoseEnvironment();
}

// Validate environment variables
if (!SUPABASE_URL) {
  console.error('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!SUPABASE_ANON_KEY) {
  console.error('[supabase] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Initialize Supabase client
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorageImpl,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

if (supabase) {
  if (__DEV__) {
    // console.log('[supabase] ✓ Client initialized successfully');
    // console.log('[supabase] URL:', SUPABASE_URL);
  }
} else {
  console.error('[supabase] ✗ Failed to initialize - missing credentials');
}

// Utility: Check if supabase is ready
export const isSupabaseReady = () => supabase !== null;

// Utility: Get current session
export const getCurrentSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Utility: Get current user
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Utility: Sign out
export const signOutUser = async () => {
  if (!supabase) throw new Error('Supabase not initialized');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export default supabase;
