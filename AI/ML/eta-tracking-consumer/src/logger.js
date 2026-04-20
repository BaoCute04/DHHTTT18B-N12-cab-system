export const logger = {
  info(message, ...rest) {
    console.log(`[eta-tracking] ${message}`, ...rest);
  },
  warn(message, ...rest) {
    console.warn(`[eta-tracking] ${message}`, ...rest);
  },
  error(message, ...rest) {
    console.error(`[eta-tracking] ${message}`, ...rest);
  }
};
