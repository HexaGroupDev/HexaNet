import { AvatarNav } from "@/components/avatar-nav";
import { profilePath } from "@/lib/profiles/profile-path";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";

export async function AuthButton() {
  const session = await getCachedSessionProfile();
  if (!session) return null;

  const email = session.email;
  const username = session.username;
  const avatarUrl = session.avatarUrl;
  const avatarInitials = (username ?? email ?? "U").charAt(0).toUpperCase();

  return (
    <AvatarNav
      avatarUrl={avatarUrl}
      avatarInitials={avatarInitials}
      username={username}
      email={email}
      profileHref={
        username ? profilePath(username) : "/dashboard/settings"
      }
    />
  );
}
