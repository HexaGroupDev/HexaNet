"use client";

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
import { useState } from "react";
import { useScreenAlert } from "@/components/screen-alert";

export default function DetailsPage() {
  const router = useRouter();
  const [birthday, setBirthday] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { show } = useScreenAlert();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      const username =
        (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
        (typeof metadata.name === "string" && metadata.name.trim()) ||
        user.email?.split("@")[0] ||
        null;
      const avatarUrl =
        typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()
          ? metadata.avatar_url
          : null;

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
            .update({
              birthday,
              email: user.email ?? null,
            })
            .eq("id", user.id)
        : await supabase.from("profiles").insert({
            id: user.id,
            birthday,
            username,
            avatar_url: avatarUrl,
            email: user.email ?? null,
            permissions: "viewer",
          });

      if (profileError) {
        throw new Error(profileError.message);
      }

      router.push("/dashboard");
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
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
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
      </CardContent>
    </Card>
  );
}
