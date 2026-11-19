// Tiny event bus (replaces window events / CustomEvent used on the web)
const listeners = {};
export const on = (evt, fn) => {
  (listeners[evt] = listeners[evt] || new Set()).add(fn);
  return () => listeners[evt].delete(fn);
};
export const emit = (evt, data) => (listeners[evt] ? [...listeners[evt]].forEach((f) => f(data)) : null);
