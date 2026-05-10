import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

export default function AvatarProgressRing({ 
  imageUrl, 
  percentage = 0, 
  size = 100, 
  strokeWidth = 6 
}) {
  const safePercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const safeSize = Math.max(50, Number(size) || 100);
  const ringThickness = Math.max(Number(strokeWidth) || 0, 1);
  const avatarSize = Math.max(safeSize - ringThickness * 4, 10);
  const halfSize = safeSize / 2;

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: safePercentage,
      duration: 900,
      useNativeDriver: false, 
    }).start();
  }, [safePercentage]);

  // Right half reveals from 0-50%
  const rightRotation = animatedValue.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['0deg', '180deg', '180deg'],
    extrapolate: 'clamp',
  });

  // Left half reveals from 50-100%
  const leftRotation = animatedValue.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['0deg', '0deg', '180deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { width: safeSize, height: safeSize }]}>
      
      {/* 1. Background Track */}
      <View
        style={[
          styles.track,
          {
            width: safeSize,
            height: safeSize,
            borderRadius: safeSize / 2,
            borderWidth: ringThickness,
          },
        ]}
      />

      {/* 2. The Filling Ring */}
      <View style={[styles.ringContainer, { width: safeSize, height: safeSize, borderRadius: safeSize / 2 }]}>
        
        {/* Right Half */}
        <View style={[styles.clipHalf, { left: halfSize, width: halfSize, height: safeSize }]}>
          <Animated.View
            style={[
              styles.progressCircle,
              {
                width: safeSize, height: safeSize, borderRadius: safeSize / 2,
                borderWidth: ringThickness, left: -halfSize,
                transform: [{ rotate: rightRotation }],
              },
            ]}
          />
        </View>

        {/* Left Half */}
        <View style={[styles.clipHalf, { left: 0, width: halfSize, height: safeSize }]}>
          <Animated.View
            style={[
              styles.progressCircle,
              {
                width: safeSize, height: safeSize, borderRadius: safeSize / 2,
                borderWidth: ringThickness, left: 0,
                transform: [{ rotate: leftRotation }],
              },
            ]}
          />
        </View>
      </View>

      {/* 3. Avatar */}
      <Image
        source={{ uri: imageUrl || 'https://via.placeholder.com/150' }}
        style={[
          styles.image,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  track: { position: 'absolute', top: 0, left: 0, borderColor: '#E5E7EB' },
  ringContainer: { position: 'absolute', top: 0, left: 0, overflow: 'hidden', transform: [{ rotate: '-90deg' }] },
  clipHalf: { position: 'absolute', top: 0, overflow: 'hidden' },
  progressCircle: { position: 'absolute', top: 0, borderColor: '#31429B' },
  image: { resizeMode: 'cover', zIndex: 10 },
});