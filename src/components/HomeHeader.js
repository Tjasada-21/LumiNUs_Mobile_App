import React from "react";
import { Image, StyleSheet, View, useWindowDimensions, Platform } from "react-native";
import { responsiveHeight, responsiveWidth } from "../utils/responsive";

const HomeHeader = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  const layout = {
    leftLogoWidth: responsiveWidth(width, 0.3, 120, isTablet ? 160 : 140),
    leftLogoHeight: responsiveHeight(height, 0.06, 40, 50),
    rightLogoWidth: responsiveWidth(width, 0.38, 140, isTablet ? 200 : 166),
    rightLogoHeight: responsiveHeight(height, 0.042, 30, 36),
    cardMinHeight: responsiveHeight(height, 0.088, 80, 92),
  };

  return (
    <View style={[styles.shell, { minHeight: layout.cardMinHeight }]}>
      <Image
        source={require("../../assets/images/NU Lipa AAO Logo.png")}
        style={[
          styles.leftLogo,
          { width: layout.leftLogoWidth, height: layout.leftLogoHeight },
        ]}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/images/LumiNUs Logo.png")}
        style={[
          styles.rightLogo,
          { width: layout.rightLogoWidth, height: layout.rightLogoHeight },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 10,
  },
  leftLogo: {
    maxWidth: 112,
  },
  rightLogo: {
    maxWidth: 168,
  },
});

export default HomeHeader;