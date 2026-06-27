const formatArg = (arg) => {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }
  return arg;
};

const write = (level, args) => {
  const payload = {
    level,
    timestamp: new Date().toISOString(),
    message: typeof args[0] === 'string' ? args[0] : undefined,
    context: args.map(formatArg),
  };

  const line = process.env.NODE_ENV === 'production'
    ? JSON.stringify(payload)
    : `[${payload.timestamp}] ${level.toUpperCase()}:`;

  if (level === 'error') console.error(line, ...(process.env.NODE_ENV === 'production' ? [] : args));
  else if (level === 'warn') console.warn(line, ...(process.env.NODE_ENV === 'production' ? [] : args));
  else console.log(line, ...(process.env.NODE_ENV === 'production' ? [] : args));
};

export default {
  error: (...args) => write('error', args),
  warn: (...args) => write('warn', args),
  info: (...args) => write('info', args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') write('debug', args);
  },
};
