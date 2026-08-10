// CRITICAL: Import URL polyfill FIRST for React Native compatibility
import 'react-native-url-polyfill/auto';

import { Platform, Alert } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import {
  Poppins_100Thin,
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import ThemedAlertComponent from './src/components/ThemedAlert';
import SplashScreenLottie from './src/screens/SplashScreenLottie';
import { initializeAuthStateListener, getCurrentUser } from './src/services/supabaseAuth';
import supabase, { isSupabaseReady } from './src/services/supabase';
import { CurrentUserProfileProvider } from './src/context/CurrentUserProfileContext';
import { UnreadMessagesProvider } from './src/context/UnreadMessagesContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { getAlumniByEmail } from './src/services/alumniQueries';

// Only import notifications on Android, or handle gracefully on iOS
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('Notifications not available:', e.message);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_100Thin,
    Poppins_200ExtraLight,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
    Poppins: Poppins_400Regular,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
    'Poppins-Black': Poppins_900Black,
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Login');
  const navigationRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      console.log('Running in Expo Go - some features will be limited');
    }
  }, []);

  useEffect(() => {
    // Initialize Supabase auth state listener
    const subscription = initializeAuthStateListener();

    // Test Supabase connectivity
    const testSupabaseConnection = async () => {
      if (!isSupabaseReady()) {
        console.error('[App] Supabase client not initialized');
        return;
      }

      try {
        if (__DEV__) console.log('[App] Testing Supabase connection...');
        
        const { data, error } = await supabase
          .from('alumnis')
          .select('id', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          console.error('[App] Supabase connection error:', error.code, error.message);
        } else {
          if (__DEV__) console.log('[App] ✓ Supabase connection successful');
        }
      } catch (err) {
        console.error('[App] Supabase test exception:', err.message || err);
      }
    };

    testSupabaseConnection();

    const bootstrapAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // ✅ Check if user's account is restricted
          const alumniProfile = await getAlumniByEmail(
            String(user.email || "").trim().toLowerCase()
          );
          
          if (alumniProfile && Number(alumniProfile.account_status) === 0) {
            // Account is restricted - sign out and go to Restricted screen
            await supabase.auth.signOut();
            setInitialRouteName('Restricted');
            return;
          }
          
          setInitialRouteName('Home');
        } else {
          setInitialRouteName('Login');
        }
      } catch (error) {
        console.error('[App] Auth check error:', error);
        setInitialRouteName('Login');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    bootstrapAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Handle notification responses - only on Android
  useEffect(() => {
    if (!Notifications || Platform.OS === 'ios') {
      console.log('[Notifications] Skipping notification setup on iOS Expo Go');
      return;
    }

    let subscription = null;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data ?? {};

        if (!navigationRef.current) {
          return;
        }

        if (data.screen) {
          if (data.targetScreen) {
            navigationRef.current.navigate(data.screen, {
              screen: data.targetScreen,
              params: { ...data },
            });
            return;
          }

          navigationRef.current.navigate(data.screen, {
            ...data,
          });
          return;
        }

        if (data.type === 'event') {
          navigationRef.current.navigate('Home', {
            screen: 'EventsScreen',
            params: { ...data },
          });
          return;
        }

        if (data.type === 'announcement') {
          navigationRef.current.navigate('Home', {
            screen: 'Feed',
            params: { ...data },
          });
        }
      });
    } catch (error) {
      console.log('[Notifications] Error setting up:', error.message);
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // FIXED RULE: Show splash screen until fonts are ready, auth is checked, AND the full custom animation finishes playing
  if (!fontsLoaded || isCheckingAuth || !animationFinished) {
    let animation = null;
    try {
      animation = require('./assets/animations/LumiNUs_splash.json');
    } catch (e) {}

    return (
      <SplashScreenLottie 
        animationSource={animation} 
        onReady={() => setAnimationFinished(true)}
      />
    );
  }

  // Set a global default Text style so all screens use Poppins by default
  // if (Text) {
  //   Text.defaultProps = Text.defaultProps || {};
  //   Text.defaultProps.style = { ...(Text.defaultProps.style || {}), fontFamily: 'Poppins_400Regular' };
  // }

  // if (TextInput) {
  //   TextInput.defaultProps = TextInput.defaultProps || {};
  //   TextInput.defaultProps.style = { ...(TextInput.defaultProps.style || {}), fontFamily: 'Poppins_400Regular' };
  // }

  return (
    <NotificationProvider>
      <CurrentUserProfileProvider>
        <UnreadMessagesProvider>
          <NavigationContainer ref={navigationRef}>
            <ThemedAlertComponent />
            <AppNavigator initialRouteName={initialRouteName} />
          </NavigationContainer>
        </UnreadMessagesProvider>
      </CurrentUserProfileProvider>
    </NotificationProvider>
  );
}