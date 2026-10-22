// Explicit nested property-detail entry point for Vercel. The root catch-all
// handles /api/properties, while this route ensures /api/properties/:id reaches
// the shared Express app with the original request path intact.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
