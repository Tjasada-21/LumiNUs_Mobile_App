import React, { useState, useEffect } from 'react';
import { TextInput } from 'react-native';

const SmartTextInput = ({ value, onFocus, onBlur, onSelectionChange, onChangeText, resetOnBlur = true, ...props }) => {
  const [selection, setSelection] = useState(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // If the field is not focused and the value changes, ensure selection is at start
    if (!focused && resetOnBlur) {
      setSelection({ start: 0, end: 0 });
    }
  }, [value, focused, resetOnBlur]);

  return (
    <TextInput
      {...props}
      value={value}
      selection={selection}
      onBlur={(e) => {
        setFocused(false);
        if (resetOnBlur) setSelection({ start: 0, end: 0 });
        if (onBlur) onBlur(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        setSelection(null);
        if (onFocus) onFocus(e);
      }}
      onSelectionChange={(e) => {
        if (onSelectionChange) onSelectionChange(e);
      }}
      onChangeText={(text) => {
        if (onChangeText) onChangeText(text);
      }}
    />
  );
};

export default SmartTextInput;
