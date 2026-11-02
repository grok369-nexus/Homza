// Dedicated admin API entry point. Reuse the shared Express app so all
// /api/admin/* endpoints share the existing authentication and role checks.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default function handler(req, res) {
  const url = typeof req.url === "string" ? req.url : "/";
  const pathname = url.split("?")[0] || "/";

  // Vercel may pass the original URL or a function-relative path.
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
