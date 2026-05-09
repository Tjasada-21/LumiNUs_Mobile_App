import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExploreScreen from '../screens/ExploreScreen';
import PerksScreen from '../screens/PerksScreen';
import ViewPerkScreen from '../screens/ViewPerkScreen';

const Stack = createNativeStackNavigator();

const ExploreStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="ExploreHome" component={ExploreScreen} />
      <Stack.Screen name="Perks" component={PerksScreen} />
      <Stack.Screen name="ViewPerkScreen" component={ViewPerkScreen} />
    </Stack.Navigator>
  );
};

export default ExploreStackNavigator;