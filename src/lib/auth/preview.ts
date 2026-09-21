/**
 * Local preview bypass for auth.
 *
 * When enabled, route guards and middleware skip authentication so the app
 * opens straight to the (mock-data) dashboard — useful for local UI review
 * when no backend is available. Double-gated: it is impossible to enable in a
 * production build, and it defaults OFF (requires an explicit env flag).
 */
export const PREVIEW_NO_AUTH =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_PREVIEW_NO_AUTH === 'true'