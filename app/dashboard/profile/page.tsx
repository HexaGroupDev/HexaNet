import { redirect } from "next/navigation";
import { profilePath } from "@/lib/profiles/profile-path";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";

export default async function ProfileIndexPage() {
  const session = await getCachedSessionProfile();
  if (!session?.username) {
    redirect("/dashboard");
  }
  redirect(profilePath(session.username));
}
