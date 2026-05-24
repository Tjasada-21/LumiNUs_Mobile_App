import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeModules, Pressable, Text, View } from "react-native";
import LoginScreen from "../screens/LoginScreen";
import MainTabNavigator from "./MainTabNavigator";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
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

const CallScreenEntry = (props) => {
  if (!NativeModules?.WebRTCModule) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#111111",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Calls require a development build with WebRTC installed.
        </Text>
        <Pressable
          onPress={() => props.navigation?.goBack?.()}
          style={{
            backgroundColor: "#31429B",
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const CallScreen = require("../screens/CallScreen").default;
  return <CallScreen {...props} />;
};

const Stack = createNativeStackNavigator();

const AppNavigator = ({ initialRouteName = "Login" }) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        animationTypeForReplace: "push",
        contentStyle: { backgroundColor: "#F9FAFB" },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={MainTabNavigator} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="ViewYearbook" component={ViewYearbookScreen} />
      <Stack.Screen name="AlumniTracer" component={AlumniTracerScreen} />
      <Stack.Screen name="TracerForm" component={TracerFormScreen} />
      <Stack.Screen
        name="EventRegistration"
        component={EventRegistrationScreen}
      />
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
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VerifyResetOtp"
        component={VerifyResetOtpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IncomingCallScreen"
        component={IncomingCallScreen}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="CallScreen"
        component={CallScreenEntry}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      {/* We will add Register and Home screens here later! */}
    </Stack.Navigator>
  );
};

export default AppNavigator;
