import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { notFound } from "next/navigation";
import { ProfileLinks } from "@/components/profile_components/profile-links";
import { ProfilePhotoUpload } from "@/components/profile_components/profile-photo-upload";
import { ProfileIdentity } from "@/components/profile_components/edit-identity";
import { ProfileInformationCard } from "@/components/profile_components/edit-information";
import { ProjectEngagementList } from "@/components/project_components/project-engagement-list";
import {
  parseFavoriteSpotifyUrl,
  parseLanguages,
  parseOptionalText,
} from "@/lib/profiles/profile-information";
import { parseProfileLinks } from "@/lib/profiles/profile-links";
import { findProfileBySlug } from "@/lib/profiles/profile-path";
import { memberIdsFromProjectMembers } from "@/lib/projects/project-members";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import { createClient } from "@/lib/supabase/server";

type ProjectRow = {
  project_id: string;
  project_name: string;
  project_slug: string;
  project_label: string | null;
  owner_id: string;
  created_at: string;
  project_members: unknown;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type ViewedProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  team_role: string | null;
  profile_links: unknown;
  birthday: unknown;
  languages: unknown;
  hometown: unknown;
  favorite_spotify_url: unknown;
  profile_photo_url: unknown;
  bio: unknown;
  pronouns: unknown;
  email: unknown;
  phone: unknown;
};

function profileHeading(isOwner: boolean, username: string | null) {
  if (isOwner) return "My Profile";
  const name = username?.trim() || "Unnamed";
  return `${name}'s Profile`;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: usernameSlug } = await params;
  const session = await getCachedSessionProfile();
  const supabase = await createClient();

  const { data: usernameRows, error: usernameError } = await supabase
    .from("profiles")
    .select("id, username");

  if (usernameError) {
    console.error("Failed to load profile usernames:", usernameError.message);
  }

  const matched = findProfileBySlug(usernameRows ?? [], usernameSlug);
  if (!matched) {
    notFound();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, team_role, profile_links, birthday, languages, hometown, favorite_spotify_url, profile_photo_url, bio, pronouns, email, phone",
    )
    .eq("id", matched.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile:", profileError.message);
  }

  if (!profile) {
    notFound();
  }

  const viewed = profile as ViewedProfile;
  const isOwner = session?.userId === viewed.id;
  const profileLinks = parseProfileLinks(viewed.profile_links);
  const birthday = parseOptionalText(viewed.birthday);
  const languages = parseLanguages(viewed.languages);
  const hometown = parseOptionalText(viewed.hometown);
  const favoriteSpotifyUrl = parseFavoriteSpotifyUrl(
    viewed.favorite_spotify_url,
  );
  const profilePhotoUrl = parseOptionalText(viewed.profile_photo_url);
  const username = parseOptionalText(viewed.username);
  const avatarUrl = parseOptionalText(viewed.avatar_url);
  const teamRole = parseOptionalText(viewed.team_role);
  const bio = parseOptionalText(viewed.bio);
  const pronouns = parseOptionalText(viewed.pronouns);
  const email =
    parseOptionalText(viewed.email) ?? (isOwner ? session?.email ?? null : null);
  const phone = parseOptionalText(viewed.phone);

  const { data: projectData, error: projectsError } = await supabase
    .from("projects")
    .select(
      "project_id, project_name, project_slug, project_label, owner_id, created_at, project_members",
    )
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Failed to load profile projects:", projectsError.message);
  }

  const projects = ((projectData ?? []) as ProjectRow[]).filter(
    (project) =>
      project.owner_id === viewed.id ||
      memberIdsFromProjectMembers(project.project_members).includes(viewed.id),
  );
  const ownerIds = [...new Set(projects.map((project) => project.owner_id))];
  const { data: profileData } =
    ownerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds)
      : { data: [] };
  const profileById = new Map<string, ProfileRow>(
    (profileData ?? []).map((row) => [row.id, row as ProfileRow]),
  );

  return (
    <main className="w-full flex justify-center">
      <div className="w-full max-w-4xl">
        <h1>{profileHeading(isOwner, username)}</h1>
        <div className="mt-8 flex flex-col gap-8">
          <div className="flex flex-col gap-5 md:flex-row">
            <ProfilePhotoUpload
              profileId={viewed.id}
              initialUrl={profilePhotoUrl}
              editable={isOwner}
            />
            <div className="flex flex-col flex-1 justify-between gap-4">
              <ProfileIdentity
                profileId={viewed.id}
                avatarUrl={avatarUrl}
                canEdit={isOwner}
                initial={{
                  username,
                  bio,
                  teamRole,
                  pronouns,
                }}
              />
              <ProfileLinks
                profileId={viewed.id}
                initialLinks={profileLinks}
                initialPhone={phone}
                email={email}
                canEdit={isOwner}
              />
            </div>
          </div>
          <section>
            <ProfileInformationCard
              profileId={viewed.id}
              canEdit={isOwner}
              initial={{
                birthday,
                languages,
                hometown,
                favoriteSpotifyUrl,
              }}
            />
          </section>
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Projects
                  <Badge variant="secondary">{projects.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Active and past projects{" "}
                  {isOwner ? "you own or contribute to" : "they own or contribute to"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectEngagementList
                  projects={projects}
                  profileById={profileById}
                  emptyTitle="No projects yet"
                  emptyDescription={
                    isOwner
                      ? "You aren't on any projects yet."
                      : `${username ?? "This person"} isn't on any projects yet.`
                  }
                />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
