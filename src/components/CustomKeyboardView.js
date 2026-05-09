import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

const CustomKeyboardView = ({
  children,
  footer,
  style,
  keyboardVerticalOffset = 10,
  ...props
}) => {
  const isIOS = Platform.OS === 'ios';
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const keyboardBehavior = keyboardVisible ? (isIOS ? 'padding' : 'height') : undefined;

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardVisible ? keyboardVerticalOffset : 0}
      style={[styles.container, style]}
      {...props}
    >
      <View style={styles.screen}>
        <View style={styles.contentContainer}>
          <View style={styles.inner}>{children}</View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    minHeight: 0,
  },
  inner: {
    flex: 1,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
});

export default CustomKeyboardView;