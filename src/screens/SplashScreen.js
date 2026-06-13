// Simple in-app splash screen that preloads the logo and runs a small scale animation
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';

export default function SplashScreen({ onReady = () => {}, backgroundColor = '#31429B' }) {
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    let mounted = true;

    const preloadAndAnimate = async () => {
      try {
        await Asset.loadAsync([require('../../assets/images/LumiNUs_Load.png')]);
      } catch (e) {
        // ignore preload errors — fallback to rendering the image
      }

      if (!mounted) return;

      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 420, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          if (mounted) onReady();
        }, 250);
      });
    };

    preloadAndAnimate();

    return () => {
      mounted = false;
    };
  }, [onReady, scale]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.Image
        source={require('../../assets/images/LumiNUs_Load.png')}
        style={[styles.logo, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 180, height: 180 },
});
