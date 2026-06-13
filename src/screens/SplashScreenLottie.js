import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function SplashScreenLottie({ onReady = () => {} }) {
  // --- CAP ANIMATIONS ---
  const capScale = useRef(new Animated.Value(0)).current; 
  const capTranslateX = useRef(new Animated.Value(0)).current; 

  // --- TEXT ANIMATIONS ---
  const textOpacity = useRef(new Animated.Value(0)).current; 
  const textTranslateX = useRef(new Animated.Value(30)).current; 

  // --- MASTER EXIT ANIMATIONS ---
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const masterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. THE POP: Cap springs into the center at a medium size
      Animated.spring(capScale, {
        toValue: 0.75,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),

      // 2. THE ENLARGE: Cap smoothly grows larger
      Animated.timing(capScale, {
        toValue: 1.15,
        duration: 400,
        useNativeDriver: true,
      }),

      Animated.delay(100),

      // 3. SLIDE & REVEAL: Cap slides left, text fades and slides right
      Animated.parallel([
        Animated.spring(capTranslateX, {
          toValue: -width * 0.25, 
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 350, 
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateX, {
          toValue: width * 0.15, 
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),

      // HOLD: Let the user read the logo
      Animated.delay(1200),

      // 4. FADE OUT: Zoom in slightly while fading to transparent
      Animated.parallel([
        Animated.timing(masterScale, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(masterOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      // CRITICAL FIX: Only trigger the transition if the animation naturally completed
      if (finished) {
        onReady();
      }
    });
    // CRITICAL FIX: Empty dependency array guarantees this sequence only runs exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: masterOpacity,
          transform: [{ scale: masterScale }],
        },
      ]}
    >
      {/* CAP ICON */}
      <Animated.Image
        source={require("../../assets/images/luminus_cap_icon.png")}
        style={[
          styles.capIcon,
          {
            transform: [{ translateX: capTranslateX }, { scale: capScale }],
          },
        ]}
        resizeMode="contain"
      />

      {/* TEXT LOGO */}
      <Animated.Image
        source={require("../../assets/images/luminus_text_logo.png")}
        style={[
          styles.textLogo,
          {
            opacity: textOpacity,
            transform: [{ translateX: textTranslateX }],
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
  },
  capIcon: {
    position: "absolute",
    width: width * 0.35, 
    height: width * 0.35,
  },
  textLogo: {
    position: "absolute",
    width: width * 0.55, 
    height: width * 0.25,
  },
});