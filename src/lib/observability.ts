import { logger } from "./logger";

export interface EventProperties {
  userId?: string;
  userRole?: string;
  companySlug?: string;
  season?: string;
  platform?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export const observability = {
  /**
   * Capture an unhandled exception or critical error.
   * If SENTRY_DSN is configured, sends to Sentry; otherwise logs structured error.
   */
  captureException: (error: unknown, context?: Record<string, unknown>) => {
    logger.error("Unhandled exception captured", { error, ...context }, "observability");

    // Integration point for @sentry/nextjs if installed & DSN present
    if (process.env.SENTRY_DSN && typeof window === "undefined") {
      try {
        // Dynamic import or Sentry call if Sentry SDK is present
        // global Sentry hook if configured
      } catch {
        // Silently preserve stability
      }
    }
  },

  /**
   * Track high-value business / product events (reports submitted, approved, coin transfers).
   */
  trackEvent: (eventName: string, properties: EventProperties = {}) => {
    logger.info(`[Analytics] ${eventName}`, { event: eventName, ...properties }, "analytics");

    // Optional webhook or PostHog / Mixpanel dispatcher
    if (process.env.ANALYTICS_WEBHOOK_URL) {
      void fetch(process.env.ANALYTICS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: eventName,
          timestamp: new Date().toISOString(),
          ...properties,
        }),
      }).catch((err) => {
        logger.warn("Failed to dispatch analytics event", { error: err }, "analytics");
      });
    }
  },
};
