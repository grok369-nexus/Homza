// Explicit nested dashboard entry point for Vercel. Reuse the shared Express app
// so /api/dashboard/tenant, /owner and /admin reach the registered handlers.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
