// CRITICAL: Import URL polyfill FIRST for React Native compatibility
import 'react-native-url-polyfill/auto';

import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import ThemedAlertComponent from './src/components/ThemedAlert';
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
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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
      const data = response.notification.request.content.data;
      
      if (navigationRef.current && data.screen) {
        navigationRef.current.navigate(data.screen, {
          ...data,
        });
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded || isCheckingAuth) {
    return null;
  }

  // Set a global default Text style so all screens use Poppins by default
  if (Text) {
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = { ...(Text.defaultProps.style || {}), fontFamily: 'Poppins_400Regular' };
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



