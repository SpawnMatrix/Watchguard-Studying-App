export const handleError = (context: string, error: unknown) => {
  // Centralized error handling
  // In a real application, this could report to an error tracking service like Sentry or Datadog
  console.error(`[Error] ${context}:`, error);
};

export const errorHandler = {
  warn(message: string, detail?: unknown) {
    console.warn(message, detail);
  },
};
