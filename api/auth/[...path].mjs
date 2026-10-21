// Explicit nested auth entry point for Vercel. Reuse the same Express app so
// /api/auth/login, /api/auth/register, /api/auth/logout and /api/auth/me
// reach the existing server-side handlers with the original request path.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
