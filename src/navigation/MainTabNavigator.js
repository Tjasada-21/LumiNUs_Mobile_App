import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Import this

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FeedScreen from '../screens/UserFeedScreen';
import ExploreStackNavigator from './ExploreStackNavigator';
import ViewYearbookScreen from '../screens/ViewYearbookScreen';
import EventsScreen from '../screens/EventsScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import ProfileViewScreen from '../screens/ProfileViewScreen';
import RegisteredEventsScreen from '../screens/RegisteredEventsScreen';
import AlumniTracerScreen from '../screens/AlumniTracerScreen';
import { useUnreadMessages } from '../context/UnreadMessagesContext';
import { sharedScreenStyles } from '../styles/sharedStyles';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { unreadCount } = useUnreadMessages();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isCompactWidth = width < 375;
  const isTablet = width >= 768;

  // We use a smaller portion of the inset (e.g., half) or a fixed small value
  // This prevents the "huge gap" while still lifting icons above the Android buttons
  const adjustedBottomInset = insets.bottom > 0 ? Math.min(insets.bottom, 25) : 0;

  const baseTabBarHeight = isTablet ? 76 : isCompactWidth ? 60 : 66;
  const totalTabBarHeight = baseTabBarHeight + adjustedBottomInset;

  const getTabBarStyle = (route) => {
    const baseStyle = {
      height: totalTabBarHeight,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      // Reduced padding here to keep it tight
      paddingBottom: adjustedBottomInset, 
      elevation: 10,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
    };
    
    // ... rest of your getTabBarStyle logic

    if (route.name !== 'Explore') {
      return baseStyle;
    }

    const nestedRouteName = getFocusedRouteNameFromRoute(route);

    if (!nestedRouteName || nestedRouteName === 'ExploreHome') {
      return {
        ...baseStyle,
        backgroundColor: '#F2C919',
        borderTopWidth: 0,
      };
    }

    return baseStyle;
  };

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: '#FFFFFF' }}
      screenOptions={({ route }) => ({
        animation: 'shift',
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'earth' : 'earth-outline';
          } else if (route.name === 'Feed') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          const showUnreadBadge = route.name === 'Messages' && unreadCount > 0;
          const iconSize = focused ? (isTablet ? 30 : 28) : (isCompactWidth ? 22 : 24);

          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={iconSize} color={color} />
              {showUnreadBadge ? <View style={styles.unreadBadge} /> : null}
            </View>
          );
        },
        tabBarActiveTintColor: '#31429B',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: getTabBarStyle(route),
        // Ensures icons aren't squished against the top of the bar
        tabBarIconStyle: {
          marginTop: insets.bottom > 0 ? 0 : 5, 
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="Messages" component={ChatScreen} />
      <Tab.Screen
        name="Explore"
        component={ExploreStackNavigator}
        options={{
          tabBarActiveTintColor: '#31429B',
          tabBarInactiveTintColor: '#31429B',
        }}
      />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={UserProfileScreen} />

      {/* Hidden Screens */}
      <Tab.Screen
        name="ViewYearbook"
        component={ViewYearbookScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AlumniTracer"
        component={AlumniTracerScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="EventsScreen"
        component={EventsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="ProfileView"
        component={ProfileViewScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="ConnectionsScreen"
        component={ConnectionsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="RegisteredEventsScreen"
        component={RegisteredEventsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#E53935',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default MainTabNavigator;