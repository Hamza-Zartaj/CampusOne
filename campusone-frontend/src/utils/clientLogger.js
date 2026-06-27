const shouldLog = import.meta.env.DEV;

const clientLogger = {
  debug: (...args) => {
    if (shouldLog) console.debug(...args);
  },
  warn: (...args) => {
    if (shouldLog) console.warn(...args);
  },
  error: (...args) => {
    if (shouldLog) console.error(...args);
  },
};

export default clientLogger;
