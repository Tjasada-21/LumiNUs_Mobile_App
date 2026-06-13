import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput } from "react-native";

const SmartTextInput = ({
  value,
  onFocus,
  onBlur,
  onSelectionChange,
  onChangeText,
  resetOnBlur = true,
  ...props
}) => {
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
      style={[styles.inputBase, focused && styles.inputFocused, props.style]}
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

const styles = StyleSheet.create({
  inputBase: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DDF0",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#1F2937",
    shadowColor: "#31429B",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputFocused: {
    borderColor: "#AAB7E7",
    shadowOpacity: 0.1,
    elevation: 3,
  },
});

export default SmartTextInput;
