// Route all /api/owner/* endpoints through the shared Express app without
// creating a separate Vercel Function for each owner endpoint.
import app from "../../artifacts/api-server/dist/vercel.mjs";

export default function handler(req, res) {
  const url = typeof req.url === "string" ? req.url : "/";
  const pathname = url.split("?")[0] || "/";

  // Vercel may provide either the original URL or a function-relative path.
  // Normalize both forms to the Express app's /api/owner/* route namespace.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return app(req, res);
  }

  if (pathname === "/owner" || pathname.startsWith("/owner/")) {
    req.url = `/api${url.startsWith("/") ? url : `/${url}`}`;
  } else {
    req.url = `/api/owner${url.startsWith("/") ? url : `/${url}`}`;
  }

  return app(req, res);
}
