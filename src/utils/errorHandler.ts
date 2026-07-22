export const errorHandler = {
  warn: (message: string, error?: any) => {
    console.warn(`[WARN] ${message}`, error ? error : "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error : "");
  },
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data ? data : "");
  }
};
