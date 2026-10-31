// Keep this function entry point in ESM so Node.js can load the generated .mjs bundle.
import app from "../artifacts/api-server/dist/vercel.mjs";

// Vercel catch-all function routing can expose the path with or without the
// "/api" prefix depending on how the request is dispatched. The Express app
// mounts its routers under "/api", so normalize the path before dispatching.
// Preserve the query string and avoid double-prefixing already-normalized URLs.
export default function handler(req, res) {
  const url = typeof req.url === "string" ? req.url : "/";
  const pathname = url.split("?")[0] || "/";
  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    req.url = `/api${url.startsWith("/") ? url : `/${url}`}`;
  }
  return app(req, res);
}
