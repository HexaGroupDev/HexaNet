"use client";

import {
  combineName,
  defaultNameFromUser,
  splitName,
} from "@/lib/auth/profile-name";
import { profilePath } from "@/lib/profiles/profile-path";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useScreenAlert } from "@/components/screen-alert";

export default function DetailsPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [teamRole, setTeamRole] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [birthday, setBirthday] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { show } = useScreenAlert();

  useEffect(() => {
    let cancelled = false;

    async function loadDefaults() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setIsBootstrapping(false);
        return;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("username, team_role, pronouns, birthday")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const nameSource =
        (typeof existing?.username === "string" && existing.username.trim()) ||
        defaultNameFromUser(user);
      const { firstName: nextFirstName, lastName: nextLastName } =
        splitName(nameSource);

      setFirstName(nextFirstName);
      setLastName(nextLastName);
      setTeamRole(
        typeof existing?.team_role === "string" ? existing.team_role : "",
      );
      setPronouns(
        typeof existing?.pronouns === "string" ? existing.pronouns : "",
      );
      setBirthday(
        typeof existing?.birthday === "string" ? existing.birthday : "",
      );
      setIsBootstrapping(false);
    }

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const username = combineName(firstName, lastName);
    if (!username) {
      show("Name is required.");
      return;
    }

    if (!birthday) {
      show("Birthday is required.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be signed in to continue.");
      }

      const metadata = user.user_metadata ?? {};
      const avatarUrl =
        typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()
          ? metadata.avatar_url
          : null;

      const profilePayload = {
        birthday,
        username,
        team_role: teamRole.trim() || null,
        pronouns: pronouns.trim() || null,
        email: user.email ?? null,
      };

      const { data: existing, error: existingError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      const { error: profileError } = existing
        ? await supabase
            .from("profiles")
            .update(profilePayload)
            .eq("id", user.id)
        : await supabase.from("profiles").insert({
            id: user.id,
            ...profilePayload,
            avatar_url: avatarUrl,
            permissions: "viewer",
          });

      if (profileError) {
        throw new Error(profileError.message);
      }

      router.push(profilePath(username));
      router.refresh();
    } catch (err: unknown) {
      show(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">A few more details</CardTitle>
        <CardDescription>
          Tell us a bit about yourself to finish setting up your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isBootstrapping ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team-role">Team role</Label>
                <Input
                  id="team-role"
                  placeholder="e.g. Copywriter, Dev"
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pronouns">Pronouns</Label>
                <Input
                  id="pronouns"
                  placeholder="e.g. she/her, they/them"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Spinner /> : "Continue to dashboard"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
