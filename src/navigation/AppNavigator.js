import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeModules, Pressable, Text, View } from "react-native";
import LoginScreen from "../screens/LoginScreen";
import MainTabNavigator from "./MainTabNavigator";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import SettingsScreen from "../screens/SettingsScreen"; // <-- Added your new SettingsScreen
import ViewYearbookScreen from "../screens/ViewYearbookScreen";
import AlumniTracerScreen from "../screens/AlumniTracerScreen";
import TracerFormScreen from "../screens/TracerFormScreen";
import EventRegistrationScreen from "../screens/EventRegistrationScreen";
import ForgetPasswordScreen from "../screens/ForgetPasswordScreen";
import NewMessageScreen from "../screens/NewMessageScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ViewEventsScreen from "../screens/ViewEventsScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import SearchMessageScreen from "../screens/SearchMessageScreen";
import ConvoScreen from "../screens/ConvoScreen";
import ChatDetailsScreen from "../screens/ChatDetailsScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import VerifyResetOtpScreen from "../screens/VerifyResetOtpScreen";
import CompleteProfileScreen from "../screens/CompleteProfileScreen";
import DraftsScreen from "../screens/DraftScreen";
import GlobalSearchScreen from "../screens/GlobalSearchScreen";
import IncomingCallScreen from "../screens/IncomingCallScreen";
import CallScreenEntry from "../screens/CallScreen";
import AddSkillsScreen from "../screens/AddSkillsScreen";
import WorkExperienceScreen from "../screens/WorkExperienceScreen";
import WorkExperienceFormScreen from "../screens/WorkExperienceFormScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={MainTabNavigator} />
      
      {/* Account / Edit Profile Route */}
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      
      {/* New Settings Route */}
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      
      <Stack.Screen name="ViewYearbook" component={ViewYearbookScreen} />
      <Stack.Screen name="AlumniTracer" component={AlumniTracerScreen} />
      <Stack.Screen name="TracerFormScreen" component={TracerFormScreen} />
      <Stack.Screen name="EventRegistrationScreen" component={EventRegistrationScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} />
      <Stack.Screen name="ConvoScreen" component={ConvoScreen} />
      <Stack.Screen name="ChatDetailsScreen" component={ChatDetailsScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SearchMessage" component={SearchMessageScreen} />
      <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} />
      <Stack.Screen name="DraftsScreen" component={DraftsScreen} />
      <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
      <Stack.Screen name="ViewEventsScreen" component={ViewEventsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VerifyResetOtp" component={VerifyResetOtpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="IncomingCallScreen" component={IncomingCallScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="CallScreen" component={CallScreenEntry} options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="NotificationsScreen" component={require('../screens/NotificationsScreen').default} />
      
      <Stack.Screen name="AddSkillsScreen" component={AddSkillsScreen} />
      <Stack.Screen name="WorkExperienceScreen" component={WorkExperienceScreen} />
      <Stack.Screen name="WorkExperienceFormScreen" component={WorkExperienceFormScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;