// Explicit nested owner API entry point for Vercel. Reuse the shared Express app
// so /api/owner/properties and other owner endpoints reach the registered handlers.
// The Express router remains responsible for authentication and owner-role checks.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
