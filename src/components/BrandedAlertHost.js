import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet, BackHandler } from 'react-native';
import { registerBrandedAlertHandler, unregisterBrandedAlertHandler } from '../services/brandedAlert';

const defaultButtons = [{ text: 'OK' }];

const getAlertVariant = (title, options = {}) => {
  if (options.variant) {
    return options.variant;
  }

  const normalizedTitle = `${title ?? ''}`.trim().toLowerCase();

  if (
    normalizedTitle.includes('error') ||
    normalizedTitle.includes('failed') ||
    normalizedTitle.includes('unable') ||
    normalizedTitle.includes('permission required')
  ) {
    return 'error';
  }

  if (
    normalizedTitle.includes('success') ||
    normalizedTitle.includes('saved') ||
    normalizedTitle.includes('uploaded') ||
    normalizedTitle.includes('welcome')
  ) {
    return 'success';
  }

  return 'neutral';
};

const BrandedAlertHost = () => {
  const [alertState, setAlertState] = useState(null);

  const hideAlert = () => {
    setAlertState(null);
  };

  useEffect(() => {
    const handler = ({ title, message, buttons = defaultButtons, options = {} }) => {
      setAlertState({
        title,
        message,
        buttons: buttons.length > 0 ? buttons : defaultButtons,
        cancelable: options.cancelable !== false,
        variant: getAlertVariant(title, options),
      });
    };

    registerBrandedAlertHandler(handler);

    return () => {
      unregisterBrandedAlertHandler(handler);
    };
  }, []);

  useEffect(() => {
    if (!alertState) {
      return undefined;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!alertState.cancelable) {
        return true;
      }

      hideAlert();
      return true;
    });

    return () => backHandler.remove();
  }, [alertState]);

  const buttons = useMemo(() => alertState?.buttons ?? defaultButtons, [alertState]);
  const accentColor =
    alertState?.variant === 'error'
      ? '#D92D20'
      : alertState?.variant === 'success'
        ? '#15803D'
        : '#31429B';
  const accentBackgroundColor =
    alertState?.variant === 'error'
      ? '#FEE4E2'
      : alertState?.variant === 'success'
        ? '#DCFCE7'
        : '#31429B';
  const buttonBackgroundColor =
    alertState?.variant === 'error'
      ? '#D92D20'
      : alertState?.variant === 'success'
        ? '#15803D'
        : '#31429B';

  const handleButtonPress = async (button) => {
    hideAlert();

    if (typeof button?.onPress === 'function') {
      await button.onPress();
    }
  };

  return (
    <Modal visible={Boolean(alertState)} transparent animationType="fade" onRequestClose={hideAlert}>
      <Pressable style={styles.overlay} onPress={alertState?.cancelable ? hideAlert : undefined}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.headerBar, { backgroundColor: accentBackgroundColor }]} />
          <Text style={[styles.title, { color: accentColor }]}>{alertState?.title ?? ''}</Text>
          {!!alertState?.message && <Text style={styles.message}>{alertState.message}</Text>}
          <View style={styles.buttonRow}>
            {buttons.map((button, index) => {
              const isPrimary = index === buttons.length - 1;
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    isPrimary ? [styles.primaryButton, { backgroundColor: buttonBackgroundColor }] : styles.secondaryButton,
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text style={[styles.buttonText, isPrimary ? styles.primaryButtonText : styles.secondaryButtonText]}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 48, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  headerBar: {
    height: 10,
    backgroundColor: '#31429B',
  },
  title: {
    color: '#f02121',
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  message: {
    color: '#1F2937',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#31429B',
  },
  secondaryButton: {
    backgroundColor: '#F2C919',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#31429B',
  },
});

export default BrandedAlertHost;
