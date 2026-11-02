// Route /api/admin/* explicitly through the shared Express API app.
// This keeps admin endpoints working even when the root catch-all is not
// selected for nested admin paths by Vercel's filesystem router.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default function handler(req, res) {
  const url = typeof req.url === "string" ? req.url : "/";
  const pathname = url.split("?")[0] || "/";

  // Keep already-normalized URLs intact; otherwise add the API/admin prefix.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return app(req, res);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    req.url = `/api${url.startsWith("/") ? url : `/${url}`}`;
  } else {
    req.url = `/api/admin${url.startsWith("/") ? url : `/${url}`}`;
  }

  return app(req, res);
}
