import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 48, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  alertBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#DCE3F5",
    elevation: 10,
    shadowColor: "#1F2937",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  headerAccent: {
    height: 8,
    width: 72,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "#31429B",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#24346F",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "Poppins-Bold",
  },
  message: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 21,
    fontFamily: "Poppins-Regular",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    minWidth: 96,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#31429B",
  },
  accentButton: {
    backgroundColor: "#F2C919",
  },
  cancelButton: {
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-Bold",
  },
  accentText: {
    color: "#24346F",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-Bold",
  },
  cancelText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-Bold",
  },
  destructiveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-Bold",
  },
});

let listeners = [];
const alertState = { queue: [], current: null };

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const ThemedAlertComponent = () => {
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const updateUI = () => {
      if (alertState.current) {
        setAlert(alertState.current);
        setVisible(true);
        scaleAnim.setValue(0.92);
        fadeAnim.setValue(0);
        translateAnim.setValue(10);

        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 230,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateAnim, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    listeners.push(updateUI);
    return () => {
      listeners = listeners.filter((l) => l !== updateUI);
    };
  }, [fadeAnim, scaleAnim, translateAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 10,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      alertState.current = null;
      if (alertState.queue.length > 0) {
        alertState.current = alertState.queue.shift();
        notifyListeners();
      }
    });
  };

  if (!alert) return null;

  const defaultButtons = [{ text: "OK", style: "default" }];
  const buttonsToUse =
    alert.buttons && alert.buttons.length > 0 ? alert.buttons : defaultButtons;

  const getButtonStyle = (button) => {
    if (button.style === "cancel") return [styles.button, styles.cancelButton];
    if (button.style === "destructive")
      return [styles.button, { backgroundColor: "#DC2626" }];
    if (button.style === "default" && buttonsToUse.length === 1)
      return [styles.button, styles.primaryButton];
    return [
      styles.button,
      button.color === "accent" ? styles.accentButton : styles.primaryButton,
    ];
  };

  const getButtonTextStyle = (button) => {
    if (button.style === "cancel") return styles.cancelText;
    if (button.style === "destructive") return styles.destructiveText;
    if (button.style === "default" && buttonsToUse.length === 1)
      return styles.primaryText;
    return button.color === "accent" ? styles.accentText : styles.primaryText;
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.alertBox,
            {
              transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
            },
          ]}
        >
          <View style={styles.headerAccent} />
          {alert.title ? <Text style={styles.title}>{alert.title}</Text> : null}
          {alert.message ? (
            <Text style={styles.message}>{alert.message}</Text>
          ) : null}
          <View style={styles.buttonContainer}>
            {buttonsToUse.map((button, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  getButtonStyle(button),
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  if (button.onPress) button.onPress();
                  handleDismiss();
                }}
              >
                <Text style={getButtonTextStyle(button)}>
                  {button.text || "OK"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const ThemedAlert = {
  alert: (title, message, buttons) => {
    const newAlert = { title, message, buttons };
    if (alertState.current) {
      alertState.queue.push(newAlert);
    } else {
      alertState.current = newAlert;
      notifyListeners();
    }
  },
};

export default ThemedAlertComponent;
