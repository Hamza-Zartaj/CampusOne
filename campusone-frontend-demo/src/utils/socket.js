const listeners = new Map();

const getListeners = (event) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  return listeners.get(event);
};

const demoSocket = {
  connected: true,
  on(event, callback) {
    if (typeof callback === 'function') getListeners(event).add(callback);
    return demoSocket;
  },
  off(event, callback) {
    if (!listeners.has(event)) return demoSocket;
    if (callback) listeners.get(event).delete(callback);
    else listeners.delete(event);
    return demoSocket;
  },
  emit(event, payload) {
    (listeners.get(event) || []).forEach((callback) => callback(payload));
    return demoSocket;
  },
  disconnect() {
    listeners.clear();
    return demoSocket;
  },
};

export const getSocket = () => demoSocket;
export const disconnectSocket = () => {
  listeners.clear();
};
export const emitDemoSocketEvent = (event, payload) => {
  demoSocket.emit(event, payload);
};
