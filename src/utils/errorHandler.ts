/**
 * Centralized error handler for logging and telemetry.
 * Replaces direct console.error calls to allow for future
 * integrations like Sentry, Datadog, etc.
 */
export const handleError = (context: string, error: unknown): void => {
  // In a production app, this is where you would send the error to a monitoring service.
  // Example: Sentry.captureException(error, { extra: { context } });

  // For now, we still log to the console, but we do it centrally.
  console.error(`[Error] ${context}:`, error);
};
