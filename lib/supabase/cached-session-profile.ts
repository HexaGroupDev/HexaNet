import { cache } from "react";
import {
  parseAppPermission,
  type AppPermission,
} from "@/lib/profiles/permissions";
import { createClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  permissions: AppPermission | null;
  teamRole: string | null;
};

/**
 * Request-scoped session for the signed-in user. Dedupes AuthButton + page
 * reads within a single RSC render via React.cache.
 *
 * Uses `getClaims()` (JWT verification) instead of `getUser()` (Auth network
 * round-trip) so dashboard chrome does not pay for a second Auth API call after
 * middleware already refreshed the session. Prefer `getUser()` for privileged
 * server mutations that must re-validate with the Auth server.
 *
 * Then loads `profiles` for username / avatar_url.
 */
export const getCachedSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const userId =
      typeof claims?.sub === "string" && claims.sub.length > 0
        ? claims.sub
        : null;

    if (error || !userId) return null;

    const email =
      typeof claims?.email === "string" && claims.email.trim() !== ""
        ? claims.email.trim()
        : null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("avatar_url, username, permissions, team_role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to load profiles row:", profileError.message);
    }

    return {
      userId,
      email,
      username:
        typeof profile?.username === "string" && profile.username.trim() !== ""
          ? profile.username.trim()
          : null,
      avatarUrl:
        typeof profile?.avatar_url === "string" &&
        profile.avatar_url.trim() !== ""
          ? profile.avatar_url
          : null,
      permissions: parseAppPermission(profile?.permissions),
      teamRole:
        typeof profile?.team_role === "string" && profile.team_role.trim() !== ""
          ? profile.team_role.trim()
          : null,
    };
  },
);
