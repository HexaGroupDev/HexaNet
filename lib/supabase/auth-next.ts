export const AUTH_NEXT_COOKIE = "hexanet_auth_next";

export function authNextCookieOptions(maxAge = 60 * 10) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Same-origin path only. Login and sign-up are excluded so those pages cannot redirect to themselves. */
export function safeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  try {
    const url = new URL(value, "https://hexanet.local");
    if (url.origin !== "https://hexanet.local") return null;
    if (url.pathname === "/auth/login" || url.pathname === "/auth/sign-up") return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
