// Explicit Vercel route for creating and managing owner properties.
// The shared Express app retains authentication, role checks, validation, and persistence.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default app;
