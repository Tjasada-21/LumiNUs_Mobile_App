import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, Pressable, Modal, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { responsiveFontSize, responsiveHeight, responsiveSpacing, responsiveWidth } from '../utils/responsive';

const BrandHeader = () => {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  const layout = {
    headerLogoWidth: responsiveWidth(width, 0.39, 160, isTablet ? 238 : 196),
    headerLogoHeight: responsiveHeight(height, 0.06, 40, 56),
    pillMinWidth: isTablet ? 132 : isCompactWidth ? 108 : 122,
    horizontalPadding: responsiveSpacing(width, 16, 14, 28),
    verticalPaddingTop: responsiveSpacing(height, 16, 14, 22),
    verticalPaddingBottom: responsiveSpacing(height, 18, 14, 24),
    pillHorizontalPadding: responsiveSpacing(width, 14, 12, 18),
    pillVerticalPadding: responsiveSpacing(height, 7, 6, 10),
    pillIconSize: responsiveWidth(width, 0.06, 20, 28),
    pillTextSize: responsiveFontSize(width, 14, 12, 16),
    accentHeight: responsiveHeight(height, 0.012, 8, 14),
  };

  const handlePillPress = () => {
    tapCountRef.current += 1;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      tapTimerRef.current = null;
    }, 700);

    if (tapCountRef.current >= 67) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      setIsImageModalVisible(true);
    }
  };

  return (
    <View style={styles.brandHeader}>
      <View style={[styles.brandRow, {
        paddingHorizontal: layout.horizontalPadding,
        paddingTop: layout.verticalPaddingTop,
        paddingBottom: layout.verticalPaddingBottom,
      }]}>
        <Pressable
          onPress={() => navigation.navigate('Home', { screen: 'HomeTab' })}
          accessibilityRole="button"
          accessibilityLabel="Go to home screen"
          hitSlop={10}
        >
          <Image
            source={require('../../assets/images/lumi-n-us-logo-landscape-2.png')}
            style={[styles.brandLogo, { width: layout.headerLogoWidth, height: layout.headerLogoHeight }]}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={handlePillPress}
          accessibilityRole="button"
          accessibilityLabel="NU LIPA logo"
          hitSlop={8}
        >
          <Image
            source={require('../../assets/images/NULP-AAO-WHITE.png')}
            style={[{ width: layout.headerLogoWidth * 0.48, height: layout.headerLogoHeight }, { transform: [{ scale: 1.5 }], right: 20 }]}
            resizeMode="cover"
          />
        </Pressable>
      </View>
      <View style={[styles.brandAccent, { height: layout.accentHeight }]} />

      <Modal visible={isImageModalVisible} transparent animationType="fade" onRequestClose={() => setIsImageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={require('../../assets/images/image.png')} style={styles.modalImage} resizeMode="cover" />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsImageModalVisible(false)} activeOpacity={0.85}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  brandHeader: {
    backgroundColor: '#31429B',
  },
  brandRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogo: {
    width: 176,
    height: 56,
    marginLeft: -15,
  },
  nulipaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  nulipaIcon: {
    width: 22,
    height: 22,
    marginRight: 6,
  },
  nulipaText: {
    color: '#31429B',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  brandAccent: {
    height: 10,
    backgroundColor: '#F2C919',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 340,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  modalCloseButton: {
    marginTop: 14,
    backgroundColor: '#31429B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modalCloseText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default BrandHeader;
