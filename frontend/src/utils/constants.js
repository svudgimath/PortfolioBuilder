// Backend API base URL — set VITE_API_BASE_URL in production (e.g. via the
// hosting provider's env vars). In dev it falls back to localhost.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
