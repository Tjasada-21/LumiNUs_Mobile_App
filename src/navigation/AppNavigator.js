import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import ViewYearbookScreen from '../screens/ViewYearbookScreen';
import AlumniTracerScreen from '../screens/AlumniTracerScreen';
import TracerFormScreen from '../screens/TracerFormScreen';
import EventRegistrationScreen from '../screens/EventRegistrationScreen';
import ForgetPasswordScreen from '../screens/ForgetPasswordScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ViewEventsScreen from '../screens/ViewEventsScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SearchMessageScreen from '../screens/SearchMessageScreen';
import ConvoScreen from '../screens/ConvoScreen';
import ChatDetailsScreen from '../screens/ChatDetailsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import VerifyResetOtpScreen from '../screens/VerifyResetOtpScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = ({ initialRouteName = 'Login' }) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationTypeForReplace: 'push',
        contentStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={MainTabNavigator} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="ViewYearbook" component={ViewYearbookScreen} />
      <Stack.Screen name="AlumniTracer" component={AlumniTracerScreen} />
      <Stack.Screen name="TracerForm" component={TracerFormScreen} />
      <Stack.Screen name="EventRegistration" component={EventRegistrationScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} />
      <Stack.Screen name="ConvoScreen" component={ConvoScreen} />
      <Stack.Screen name="ChatDetailsScreen" component={ChatDetailsScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SearchMessage" component={SearchMessageScreen} />
      <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} />
      <Stack.Screen name="ViewEventsScreen" component={ViewEventsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VerifyResetOtp" component={VerifyResetOtpScreen} options={{ headerShown: false }} />
      {/* We will add Register and Home screens here later! */}


    </Stack.Navigator>
  );
};

export default AppNavigator;