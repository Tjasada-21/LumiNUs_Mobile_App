import supabase, { isSupabaseReady } from './supabase';
import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';

/**
 * Supabase Authentication Service
 * Handles all authentication operations using Supabase Auth
 */

let currentUser = null;
let authStateListeners = [];

const getAlumniByEmailInternal = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    // if (__DEV__) console.log('[supabaseAuth] Querying alumni for email:', normalizedEmail);
    const { data, error } = await supabase
      .from('alumnis')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('[supabaseAuth] Alumni query error:', error.message || error);
      throw error;
    }

    // if (__DEV__) console.log('[supabaseAuth] Alumni query result:', data?.id || 'null');
    return data || null;
  } catch (err) {
    console.error('[supabaseAuth] getAlumniByEmailInternal exception:', err.message || err);
    throw err;
  }
};

const resolveCurrentAlumniFromSession = async (session) => {
  const authEmail = session?.user?.email;
  // if (__DEV__) console.log('[supabaseAuth] Resolving alumni from session for email:', authEmail);

  if (!authEmail) {
    console.warn('[supabaseAuth] No email in session user');
    return null;
  }

  try {
    const alumni = await getAlumniByEmailInternal(authEmail);
    if (!alumni) {
      console.warn('[supabaseAuth] No alumni profile found for email:', authEmail);
      return null;
    }

    // if (__DEV__) console.log('[supabaseAuth] Alumni resolved:', alumni.id);
    return {
      ...alumni,
      auth_user_id: session?.user?.id || null,
    };
  } catch (err) {
    console.error('[supabaseAuth] Failed to resolve alumni:', err.message || err);
    return null;
  }
};

const tryLegacyPasswordMigrationSignIn = async (email, password) => {
  try {
    const { data: alumni, error: alumniError } = await supabase
      .from('alumnis')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (alumniError || !alumni?.password_hash) {
      return null;
    }

    const isLegacyPasswordMatch = await bcrypt.compare(password, alumni.password_hash);
    if (!isLegacyPasswordMatch) {
      return null;
    }

    // Legacy password is valid; create corresponding Supabase Auth user.
    // If already registered, sign-in below will still succeed with the same password.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          alumni_id: alumni.id,
          migrated_legacy: true,
        },
      },
    });

    const signUpMessage = signUpError?.message || '';
    if (signUpError && !signUpMessage.toLowerCase().includes('already registered')) {
      throw signUpError;
    }

    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (retryError) {
      throw retryError;
    }

    // if (__DEV__) console.log('[supabaseAuth] Legacy account migrated and signed in:', retryData?.user?.id);
    return retryData;
  } catch (error) {
    console.warn('[supabaseAuth] Legacy migration sign-in failed:', error?.message || error);
    return null;
  }
};

/**
 * Initialize auth state listener
 */
export const initializeAuthStateListener = () => {
  if (!isSupabaseReady()) {
    console.error('[supabaseAuth] Supabase not initialized');
    return;
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          currentUser = await resolveCurrentAlumniFromSession(session);
        } catch (err) {
          currentUser = null;
          console.error('[supabaseAuth] Failed to resolve alumni profile on sign in:', err?.message || err);
        }
        // Store session locally
        if (session.refresh_token) {
          await SecureStore.setItemAsync('supabaseRefreshToken', session.refresh_token);
        }
        // if (__DEV__) console.log('[supabaseAuth] User signed in:', currentUser?.id || session.user.id);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        await SecureStore.deleteItemAsync('supabaseRefreshToken');
        // if (__DEV__) console.log('[supabaseAuth] User signed out');
      }

      // Notify all listeners
      authStateListeners.forEach(listener => listener({ user: currentUser, session }));
    }
  );

  return subscription;
};

/**
 * Add listener for auth state changes
 */
export const addAuthStateListener = (listener) => {
  authStateListeners.push(listener);
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== listener);
  };
};

/**
 * Sign up a new user
 */
export const signUpUser = async (email, password, userData) => {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) throw error;

    // if (__DEV__) console.log('[supabaseAuth] User signed up:', data.user?.id);
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('[supabaseAuth] Sign up error:', error.message);
    throw error;
  }
};

/**
 * Sign in user with email and password
 */
export const signInUser = async (email, password) => {
  if (!isSupabaseReady()) {
    const msg = 'Supabase not initialized - check env vars EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY';
    console.error('[supabaseAuth]', msg);
    throw new Error(msg);
  }

  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    // if (__DEV__) console.log('[supabaseAuth] Attempting sign in for:', normalizedEmail);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const errMsg = error?.message || '';
      if (errMsg.includes('Invalid login credentials')) {
        const legacyData = await tryLegacyPasswordMigrationSignIn(normalizedEmail, password);
        if (legacyData?.user) {
          const alumniProfile = await getAlumniByEmailInternal(normalizedEmail);
          currentUser = alumniProfile
            ? { ...alumniProfile, auth_user_id: legacyData.user.id }
            : null;
          if (legacyData.session?.refresh_token) {
            await SecureStore.setItemAsync('supabaseRefreshToken', legacyData.session.refresh_token);
          }
          return { user: currentUser, session: legacyData.session };
        }
        if (__DEV__) console.warn('[supabaseAuth] Invalid login credentials for provided account');
      } else {
        console.error('[supabaseAuth] Sign in error - error object:', error);
      }
      throw error;
    }

    const alumniProfile = await getAlumniByEmailInternal(normalizedEmail);
    currentUser = alumniProfile
      ? { ...alumniProfile, auth_user_id: data.user?.id || null }
      : null;

    // Store refresh token for persistence
    if (data.session?.refresh_token) {
      await SecureStore.setItemAsync('supabaseRefreshToken', data.session.refresh_token);
    }

    // if (__DEV__) console.log('[supabaseAuth] User signed in:', currentUser?.id || data.user?.id);
    return { user: currentUser, session: data.session };
  } catch (error) {
    const errMsg = error?.message || '';
    if (errMsg.includes('Invalid login credentials')) {
      if (__DEV__) console.warn('[supabaseAuth] Sign in rejected: invalid credentials');
    } else {
      console.error('[supabaseAuth] Sign in error:', error.message || error);
    }
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    currentUser = null;
    await SecureStore.deleteItemAsync('supabaseRefreshToken');

    // if (__DEV__) console.log('[supabaseAuth] User signed out');
  } catch (error) {
    console.error('[supabaseAuth] Sign out error:', error.message);
    throw error;
  }
};

/**
 * Get current user
 * Uses getSession first to check if there's an active session (safer than getUser)
 */
export const getCurrentUser = async () => {
  if (!isSupabaseReady()) {
    return null;
  }

  try {
    // First check if there's a session at all
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('[supabaseAuth] Session check error:', sessionError.message);
      return null;
    }

    // If no session, return null (no error to log - this is expected for logged-out users)
    if (!session) {
      return null;
    }

    const alumni = await resolveCurrentAlumniFromSession(session);
    currentUser = alumni;
    return alumni;
  } catch (error) {
    console.error('[supabaseAuth] Get current user error:', error.message);
    return null;
  }
};

/**
 * Get cached current user (synchronous)
 */
export const getCachedUser = () => currentUser;

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  if (!isSupabaseReady()) {
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    return session;
  } catch (error) {
    console.error('[supabaseAuth] Get session error:', error.message);
    return null;
  }
};

/**
 * Refresh session using stored refresh token
 */
export const refreshSession = async () => {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    const refreshToken = await SecureStore.getItemAsync('supabaseRefreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) throw error;

    if (data.session?.refresh_token) {
      await SecureStore.setItemAsync('supabaseRefreshToken', data.session.refresh_token);
    }

    currentUser = await resolveCurrentAlumniFromSession(data.session);
    return { user: currentUser, session: data.session };
  } catch (error) {
    console.error('[supabaseAuth] Refresh session error:', error.message);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email) => {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'app://reset-password',
    });

    if (error) throw error;

    // if (__DEV__) console.log('[supabaseAuth] Password reset email sent');
  } catch (error) {
    console.error('[supabaseAuth] Reset password error:', error.message);
    throw error;
  }
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword) => {
  if (!isSupabaseReady()) {
    throw new Error('Supabase not initialized');
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    // if (__DEV__) console.log('[supabaseAuth] Password updated');
  } catch (error) {
    console.error('[supabaseAuth] Update password error:', error.message);
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isUserAuthenticated = () => {
  return currentUser !== null;
};

/**
 * Get user ID (synchronous)
 */
export const getUserId = () => currentUser?.id || null;

/**
 * Get user email (synchronous)
 */
export const getUserEmail = () => currentUser?.email || null;
