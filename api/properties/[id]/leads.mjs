// Explicit Vercel route entry point for property enquiry submissions.
// Reuse the shared Express app so tenant authentication and validation stay centralized.
import app from "../../../artifacts/api-server/dist/vercel.mjs";

export default app;
