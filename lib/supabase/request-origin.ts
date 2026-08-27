/**
 * Public origin for auth redirects.
 * On Vercel, `request.url` can be `http://localhost:3000` even in production.
 * Prefer the forwarded host the browser actually used.
 */
export function getRequestOrigin(request: Request) {
  const { origin } = new URL(request.url);

  if (process.env.NODE_ENV === "development") {
    return origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!forwardedHost) return origin;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto === "http" ? "http" : "https";
  return `${protocol}://${forwardedHost}`;
}
