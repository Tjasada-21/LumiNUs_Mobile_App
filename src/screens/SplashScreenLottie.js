// Lottie-based in-app splash. Pass `animationSource` prop or place JSON at
// `assets/animations/LumiNUs_splash.json`.
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import LottieView from 'lottie-react-native';

export default function SplashScreenLottie({ onReady = () => {}, animationSource = null, backgroundColor = '#31429B' }) {
  const ref = useRef(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        if (ref.current && animationSource) {
          ref.current.play();
        }
      } catch (e) {
        // ignore
      }

      // If animation is provided, call onReady after it finishes (estimate or listen to onAnimationFinish)
      const timeout = setTimeout(() => {
        if (mounted) onReady();
      }, 1500);

      return () => {
        clearTimeout(timeout);
      };
    };

    const cleanupPromise = run();
    return () => {
      mounted = false;
      if (cleanupPromise && cleanupPromise.then) cleanupPromise.then(() => {});
    };
  }, [onReady, animationSource]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {animationSource ? (
        <LottieView
          ref={ref}
          source={animationSource}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
      ) : (
        <Image source={require('../../assets/images/LumiNUs_Load.png')} style={styles.logo} resizeMode="contain" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lottie: { width: 220, height: 220 },
  logo: { width: 180, height: 180 },
});
