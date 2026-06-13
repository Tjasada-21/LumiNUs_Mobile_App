// CRITICAL: Import URL polyfill FIRST for React Native compatibility
import 'react-native-url-polyfill/auto';

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import ThemedAlertComponent from './src/components/ThemedAlert';
import SplashScreenLottie from './src/screens/SplashScreenLottie';
import { initializeAuthStateListener, getCurrentUser } from './src/services/supabaseAuth';
import supabase, { isSupabaseReady } from './src/services/supabase';
import { CurrentUserProfileProvider } from './src/context/CurrentUserProfileContext';
import { UnreadMessagesProvider } from './src/context/UnreadMessagesContext';
import { NotificationProvider } from './src/context/NotificationContext';
import * as Notifications from 'expo-notifications';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins: Poppins_400Regular,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [animationFinished, setAnimationFinished] = useState(false); // NEW State to hold the router back
  const [initialRouteName, setInitialRouteName] = useState('Login');
  const navigationRef = useRef(null);

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
        
        // Try a simple count query on alumnis table
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
        setInitialRouteName(user ? 'Home' : 'Login');
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

  // Handle notification responses
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
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

    return () => subscription.remove();
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
        onReady={() => setAnimationFinished(true)} // Handle closure signal safely
      />
    );
  }

  // Set a global default Text style so all screens use Poppins by default
  if (Text) {
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = { ...(Text.defaultProps.style || {}), fontFamily: 'Poppins_400Regular' };
  }

  if (TextInput) {
    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = { ...(TextInput.defaultProps.style || {}), fontFamily: 'Poppins_400Regular' };
  }

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