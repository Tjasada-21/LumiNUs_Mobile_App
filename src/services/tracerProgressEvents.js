const listeners = new Set();

export const subscribeTracerProgressRefresh = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const emitTracerProgressRefresh = (payload = Date.now()) => {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.warn('[tracerProgressEvents] listener error:', error?.message || error);
    }
  });
};