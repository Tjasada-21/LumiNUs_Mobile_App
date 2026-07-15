// ExploreStackNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ExploreScreen from "../screens/ExploreScreen";
import PerksScreen from "../screens/PerksScreen";
import ViewPerkScreen from "../screens/ViewPerkScreen";
import ViewYearbookScreen from "../screens/ViewYearbookScreen";
import TracerMenuScreen from "../screens/TracerMenuScreen";
import PhaseSectionsScreen from "../screens/PhaseSectionsScreen";
import SectionQuestionsScreen from "../screens/SectionQuestionsScreen";
import SectionCompleteScreen from "../screens/SectionCompleteScreen";

const Stack = createNativeStackNavigator();

const ExploreStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="ExploreHome"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="ExploreHome" component={ExploreScreen} />
      <Stack.Screen name="Perks" component={PerksScreen} />
      <Stack.Screen name="ViewPerkScreen" component={ViewPerkScreen} />
      <Stack.Screen name="ViewYearbook" component={ViewYearbookScreen} />
      <Stack.Screen name="TracerMenu" component={TracerMenuScreen} />
      <Stack.Screen name="PhaseSections" component={PhaseSectionsScreen} />
      <Stack.Screen name="SectionQuestions" component={SectionQuestionsScreen} />
      <Stack.Screen name="SectionComplete" component={SectionCompleteScreen} />
    </Stack.Navigator>
  );
};

export default ExploreStackNavigator;