import React, { useMemo } from "react";
import { Image, Text, View, StyleSheet } from "react-native";
import { getAvatarInitials, normalizeLuminusImageUri } from "../utils/imageUtils";

const AvatarInitials = ({
  name,
  uri,
  size = 44,
  backgroundColor = "#31429B",
  foregroundColor = "#FFFFFF",
  style,
  imageStyle,
  textStyle,
}) => {
  const normalizedUri = useMemo(() => {
    if (!uri) return "";
    const uriString = String(uri);
    if (
      /^https?:\/\//i.test(uriString) ||
      /^file:/i.test(uriString) ||
      /^content:/i.test(uriString) ||
      /^data:/i.test(uriString)
    ) {
      return uriString;
    }
    return normalizeLuminusImageUri(uriString);
  }, [uri]);

  const initials = useMemo(() => getAvatarInitials(name), [name]);
  const borderRadius = size / 2;

  if (normalizedUri) {
    return (
      <Image
        source={{ uri: normalizedUri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius, backgroundColor },
          imageStyle,
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius, backgroundColor },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          { color: foregroundColor, fontSize: Math.max(12, Math.round(size * 0.38)) },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "800",
    textAlign: "center",
  },
});

export default AvatarInitials;