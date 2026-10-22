// Explicit nested route for Vercel so /api/favorites/:propertyId reaches
// the shared Express app instead of being handled as a missing serverless route.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
