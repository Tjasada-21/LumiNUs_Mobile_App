// src/components/CustomText.js
import React from 'react';
import { Text as RNText } from 'react-native';

const CustomText = (props) => {
  const { style, ...rest } = props;
  
  // Extract fontFamily from style
  let fontFamily = 'Poppins-Regular';
  
  if (style) {
    if (Array.isArray(style)) {
      for (const s of style) {
        if (s?.fontFamily) {
          fontFamily = s.fontFamily;
          break;
        }
      }
    } else if (style.fontFamily) {
      fontFamily = style.fontFamily;
    }
  }
  
  return (
    <RNText 
      {...rest} 
      style={[{ fontFamily }, style]} 
    />
  );
};

export default CustomText;