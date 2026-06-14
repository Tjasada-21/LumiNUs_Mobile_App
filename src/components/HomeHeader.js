import React from "react";
import { Image, StyleSheet, View, useWindowDimensions, Platform } from "react-native";
import { responsiveHeight, responsiveWidth } from "../utils/responsive";

const HomeHeader = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  const layout = {
    // Tightened the widths to cut out the invisible transparent padding
    leftLogoWidth: responsiveWidth(width, 0.28, 110, isTablet ? 150 : 130),
    leftLogoHeight: responsiveHeight(height, 0.05, 40, 50),
    rightLogoWidth: responsiveWidth(width, 0.36, 135, isTablet ? 180 : 160),
    rightLogoHeight: responsiveHeight(height, 0.05, 40, 50),
    // Adjusted height to accommodate the transparent outer shell
    cardMinHeight: responsiveHeight(height, 0.08, 60, 80), 
  };

  return (
    // pointerEvents="box-none" ensures you can still tap the screen behind the transparent areas
    <View style={styles.transparentWrapper} pointerEvents="box-none">
      <View style={[styles.whiteContainer, { minHeight: layout.cardMinHeight }]}>
        <View style={styles.logoContainer}>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  transparentWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent", 
    // REMOVED top and horizontal padding so the white container touches the edges
    paddingBottom: 24, // Keeps space below for the shadow to render without cutting off
    zIndex: 1000, 
  },
  whiteContainer: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "flex-end", // Pushes logos safely below the notch
    
    // Moved the notch padding INSIDE the white box so it extends behind your device's status bar
    paddingTop: Platform.OS === "ios" ? 55 : 35, 
    paddingBottom: 20,
    paddingHorizontal: 16,
    width: "100%",

    // Only round the bottom corners now that it touches the top edge
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40, 

    // The Magic Floating Shadow
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", 
    gap: 6, 
    width: "100%",
  },
  leftLogo: {
    marginRight: -2, 
  },
  rightLogo: {
    marginLeft: -2,
  },
});

export default HomeHeader;