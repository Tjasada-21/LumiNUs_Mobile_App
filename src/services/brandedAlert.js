let alertHandler = null;

export const registerBrandedAlertHandler = (handler) => {
  alertHandler = handler;
};

export const unregisterBrandedAlertHandler = (handler) => {
  if (alertHandler === handler) {
    alertHandler = null;
  }
};

export const showBrandedAlert = (title, message, buttons = [{ text: 'OK' }], options = {}) => {
  if (typeof alertHandler === 'function') {
    alertHandler({ title, message, buttons, options });
    return;
  }

  console.warn('Branded alert host is not registered yet:', title, message);
};
