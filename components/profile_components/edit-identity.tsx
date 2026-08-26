"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  profilePath,
  slugifyProfileName,
} from "@/lib/profiles/profile-path";

export type ProfileIdentity = {
  username: string | null;
  bio: string | null;
  teamRole: string | null;
  pronouns: string | null;
};

const BIO_MAX_WORDS = 230;

function bioWordCount(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return value.trim() ? words.length : 0;
}

function limitBioToWords(value: string, max: number) {
  const parts = value.match(/\S+\s*/g);
  if (!parts) return value;
  const count = parts.filter((part) => part.trim().length > 0).length;
  if (count <= max) return value;
  return parts.slice(0, max).join("");
}

function initials(username: string | null) {
  if (!username?.trim()) return "?";
  return username.trim().slice(0, 2).toUpperCase();
}

export function EditIdentityDialog({
  initial,
  onSave,
}: {
  initial: ProfileIdentity;
  onSave: (next: ProfileIdentity) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState(initial.username ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [teamRole, setTeamRole] = useState(initial.teamRole ?? "");
  const [pronouns, setPronouns] = useState(initial.pronouns ?? "");

  function resetForm() {
    setUsername(initial.username ?? "");
    setBio(limitBioToWords(initial.bio ?? "", BIO_MAX_WORDS));
    setTeamRole(initial.teamRole ?? "");
    setPronouns(initial.pronouns ?? "");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) resetForm();
  }

  function handleSave() {
    setError(null);

    const nextUsername = username.trim();
    if (!nextUsername) {
      setError("Username is required.");
      return;
    }

    const nextBio = bio.trim();
    if (bioWordCount(nextBio) > BIO_MAX_WORDS) {
      setError(`Description must be ${BIO_MAX_WORDS} words or fewer.`);
      return;
    }

    setOpen(false);
    void onSave({
      username: nextUsername,
      bio: nextBio || null,
      teamRole: teamRole.trim() || null,
      pronouns: pronouns.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Edit profile" />
              }
            />
          }
        >
          <Pencil />
        </TooltipTrigger>
        <TooltipContent>Edit profile</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your name, role, pronouns, and bio.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="team-role">Job role</FieldLabel>
            <Input
              id="team-role"
              placeholder="Enter your job role"
              value={teamRole}
              onChange={(e) => setTeamRole(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pronouns">Pronouns</FieldLabel>
            <Input
              id="pronouns"
              placeholder="Enter pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bio">Description</FieldLabel>
            <div className="relative">
              <Textarea
                id="bio"
                placeholder="Write a short intro"
                className="pb-7"
                value={bio}
                onChange={(e) =>
                  setBio(limitBioToWords(e.target.value, BIO_MAX_WORDS))
                }
              />
              <Badge
                variant="secondary"
                className="pointer-events-none absolute right-2 bottom-2 opacity-70"
              >
                {bioWordCount(bio)}/{BIO_MAX_WORDS}
              </Badge>
            </div>
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileIdentity({
  profileId,
  avatarUrl,
  initial,
  canEdit = true,
}: {
  profileId: string;
  avatarUrl: string | null;
  initial: ProfileIdentity;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState(initial);
  const [syncError, setSyncError] = useState<string | null>(null);
  const identityRef = useRef(initial);
  const [prevInitial, setPrevInitial] = useState(initial);

  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setIdentity(initial);
    identityRef.current = initial;
  }

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  async function persist(next: ProfileIdentity) {
    const previous = identityRef.current;
    identityRef.current = next;
    setIdentity(next);
    setSyncError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        username: next.username,
        bio: next.bio,
        team_role: next.teamRole,
        pronouns: next.pronouns,
      })
      .eq("id", profileId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      identityRef.current = previous;
      setIdentity(previous);
      setSyncError(
        error?.message ??
          "Could not save. You may not have permission to update this profile.",
      );
      return;
    }

    const previousSlug = previous.username
      ? slugifyProfileName(previous.username)
      : "";
    const nextSlug = next.username ? slugifyProfileName(next.username) : "";
    if (next.username && previousSlug !== nextSlug) {
      router.replace(profilePath(next.username));
      return;
    }
    router.refresh();
  }

  const { username, bio, teamRole, pronouns } = identity;

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={username ?? "Avatar"} />
          ) : null}
          <AvatarFallback>{initials(username)}</AvatarFallback>
        </Avatar>
        <div className="w-full">
          <div className="flex w-full justify-between gap-2">
            <div className="flex min-w-0 items-end gap-1">
              <div className="truncate text-2xl">{username ?? "Unnamed"}</div>
              {pronouns ? (
                <div className="shrink-0 -translate-y-1 text-xs opacity-50">
                  {pronouns}
                </div>
              ) : null}
            </div>
            {canEdit ? (
              <EditIdentityDialog initial={identity} onSave={persist} />
            ) : null}
          </div>
          {teamRole ? (
            <div className="text-sm tracking-tight opacity-75">{teamRole}</div>
          ) : null}
        </div>
      </div>
      <div className={bio ? "mt-3" : "mt-3 opacity-50"}>
        {bio ?? "No bio yet."}
      </div>
      {syncError ? (
        <p className="mt-2 text-sm text-destructive">{syncError}</p>
      ) : null}
    </div>
  );
}
