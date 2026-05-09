export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const responsiveWidth = (screenWidth, ratio, min, max) =>
  clamp(screenWidth * ratio, min, max);

export const responsiveHeight = (screenHeight, ratio, min, max) =>
  clamp(screenHeight * ratio, min, max);

export const responsiveFontSize = (screenWidth, baseSize, min, max) => {
  const scale = screenWidth / 375;
  return clamp(baseSize * scale, min, max);
};

export const responsiveSpacing = (screenWidth, baseSize, min, max) => {
  const scale = screenWidth / 375;
  return clamp(baseSize * scale, min, max);
};

export const responsiveRadius = (screenWidth, baseSize, min, max) => {
  const scale = screenWidth / 375;
  return clamp(baseSize * scale, min, max);
};
