import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { profilePath } from "@/lib/profiles/profile-path";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  team_role: string | null;
};

function initials(username: string | null) {
  if (!username?.trim()) return "?";
  return username.trim().slice(0, 2).toUpperCase();
}

export default async function Community() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, team_role")
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
        <div className="flex flex-col">
          {people.map((person) => {
            const name = person.username ?? "Unnamed";
            const href = person.username ? profilePath(person.username) : null;
            const rowClassName =
              "flex items-center gap-3 rounded-lg px-1 py-2";
            const inner = (
              <>
                <Avatar size="sm">
                  {person.avatar_url ? (
                    <AvatarImage src={person.avatar_url} alt={name} />
                  ) : null}
                  <AvatarFallback>{initials(person.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{name}</p>
                  {person.team_role ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {person.team_role}
                    </p>
                  ) : null}
                </div>
              </>
            );

            return href ? (
              <Link
                key={person.id}
                href={href}
                className={`${rowClassName} hover:bg-muted/60`}
              >
                {inner}
              </Link>
            ) : (
              <div key={person.id} className={rowClassName}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
