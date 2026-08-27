/**
 * Demo mode feature flag (IKSH-46).
 *
 * The app must not ship fabricated demo data in production. All demo surfaces —
 * fabricated orders, mock chat histories, and the `/demo` / `mock-*` order
 * routes — are only reachable when `NEXT_PUBLIC_DEMO_MODE=true` is set at build
 * time (used exclusively for design validation).
 *
 * Policy:
 * - When `NEXT_PUBLIC_DEMO_MODE` is anything other than "true" (unset, "false",
 *   "0", ...) `DEMO_MODE` is `false` and demo paths fall through to the real
 *   order flow, which surfaces a not-found/error state for ids that do not
 *   exist on the backend.
 * - Components that can render fabricated data gate those branches with
 *   `DEMO_MODE && ...` inline so the minifier folds the condition to `false`
 *   and tree-shakes the demo-only fixtures out of production bundles.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
