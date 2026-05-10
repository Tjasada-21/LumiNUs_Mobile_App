import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

export default function AvatarProgressRing({ 
  imageUrl, 
  percentage = 0, 
  size = 100, 
  strokeWidth = 6 
}) {
  // Ensure valid values
  const safePercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const safeSize = Math.max(50, Number(size) || 100);
  const ringThickness = Math.max(1, Number(strokeWidth) || 6);
  const avatarSize = Math.max(10, safeSize - ringThickness * 4);
  
  // Animation value
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: safePercentage,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [safePercentage]);

  // Convert percentage to rotation degrees (0-360)
  const rotation = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { width: safeSize, height: safeSize }]}>
      {/* Background track (grey circle) */}
      <View
        style={[
          styles.backgroundTrack,
          {
            width: safeSize,
            height: safeSize,
            borderRadius: safeSize / 2,
            borderWidth: ringThickness,
          },
        ]}
      />

      {/* Rotating progress ring */}
      <Animated.View
        style={[
          styles.progressRing,
          {
            width: safeSize,
            height: safeSize,
            borderRadius: safeSize / 2,
            borderWidth: ringThickness,
            transform: [{ rotate: rotation }],
          },
        ]}
      />

      {/* Center avatar image */}
      <Image
        source={{ uri: imageUrl || 'https://via.placeholder.com/150' }}
        style={[
          styles.avatarImage,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundTrack: {
    position: 'absolute',
    borderColor: '#E5E7EB',
  },
  progressRing: {
    position: 'absolute',
    borderColor: '#31429B',
    borderTopColor: '#31429B',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  avatarImage: {
    resizeMode: 'cover',
    zIndex: 10,
  },
});