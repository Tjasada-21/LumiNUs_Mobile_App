import React from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { responsiveHeight, responsiveWidth } from "../utils/responsive";

const HomeHeader = () => {
  const { width, height } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;

  const layout = {
    containerHorizontalMargin: 0,
    containerTopMargin: 0,
    leftLogoWidth: responsiveWidth(width, 0.22, 74, isTablet ? 108 : 90),
    leftLogoHeight: responsiveHeight(height, 0.04, 22, 32),
    rightLogoWidth: responsiveWidth(width, 0.38, 132, isTablet ? 200 : 166),
    rightLogoHeight: responsiveHeight(height, 0.042, 24, 36),
    cardMinHeight: responsiveHeight(height, 0.088, 76, 92),
  };

  return (
    <View
      style={[
        styles.shell,
        {
          marginHorizontal: layout.containerHorizontalMargin,
          marginTop: layout.containerTopMargin,
          minHeight: layout.cardMinHeight,
        },
      ]}
    >
      <Image
        source={require("../../assets/images/NU Lipa AAO Logo.png")}
        style={[
          styles.leftLogo,
          {
            width: layout.leftLogoWidth,
            height: layout.leftLogoHeight,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/images/LumiNUs Logo.png")}
        style={[
          styles.rightLogo,
          {
            width: layout.rightLogoWidth,
            height: layout.rightLogoHeight,
          },
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  leftLogo: {
    maxWidth: 112,
  },
  rightLogo: {
    maxWidth: 168,
  },
});

export default HomeHeader;
