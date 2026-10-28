// Explicit Vercel route entry point for the owner leads API.
// Reuse the shared Express app so authentication and authorization remain centralized.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
