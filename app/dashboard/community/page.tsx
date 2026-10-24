import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { parseOptionalText } from "@/lib/profiles/profile-information";
import { profilePath } from "@/lib/profiles/profile-path";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
  team_role: string | null;
};

function initials(username: string | null) {
  if (!username?.trim()) return "?";
  return username.trim().slice(0, 2).toUpperCase();
}

function displayPhoto(person: ProfileRow) {
  return (
    parseOptionalText(person.profile_photo_url) ??
    parseOptionalText(person.avatar_url)
  );
}

export default async function Community() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, profile_photo_url, team_role")
    .order("username");

  if (error) {
    console.error("Failed to load profiles:", error.message);
  }

  const people = (data ?? []) as ProfileRow[];

  return (
    <main className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Community</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1>Community</h1>
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teammates yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {people.map((person) => {
            const name = person.username ?? "Unnamed";
            const href = person.username ? profilePath(person.username) : null;
            const photo = displayPhoto(person);
            const card = (
              <Card className="group h-full gap-0 overflow-hidden py-0">
                <div className="aspect-[4/5] bg-muted">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-2xl font-medium text-muted-foreground">
                      {initials(person.username)}
                    </div>
                  )}
                </div>
                <CardHeader className="gap-0.5 py-3">
                  <div className="flex w-fit max-w-full flex-col">
                    <CardTitle className="truncate">{name}</CardTitle>
                    <div className="h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100" />
                  </div>
                  {person.team_role ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {person.team_role}
                    </p>
                  ) : null}
                </CardHeader>
              </Card>
            );

            return href ? (
              <Link key={person.id} href={href} className="hover:cursor-pointer">
                {card}
              </Link>
            ) : (
              <div key={person.id}>{card}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}
