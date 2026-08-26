"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ImageIcon, Mail, Phone, PlusCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AddSocialLinkDialog } from "@/components/profile_components/add-social-link";
import { createClient } from "@/lib/supabase/client";
import {
  faviconUrl,
  siteNameFromUrl,
  toHref,
  type ProfileLink,
} from "@/lib/profiles/profile-links";

function LinkFavicon({ url, name }: { url: string; name: string }) {
  const src = faviconUrl(url);
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return <ImageIcon className="size-3.5 text-muted-foreground" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={name}
      width={14}
      height={14}
      className="size-3.5"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function ProfileLinks({
  profileId,
  initialLinks,
  initialPhone = null,
  email = null,
  canEdit = true,
}: {
  profileId: string;
  initialLinks: ProfileLink[];
  initialPhone?: string | null;
  email?: string | null;
  canEdit?: boolean;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [savedPhone, setSavedPhone] = useState(initialPhone ?? "");
  const [open, setOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const linksRef = useRef(initialLinks);
  const phoneRef = useRef(initialPhone ?? "");
  const [prevInitialLinks, setPrevInitialLinks] = useState(initialLinks);
  const [prevInitialPhone, setPrevInitialPhone] = useState(initialPhone);

  if (initialLinks !== prevInitialLinks) {
    setPrevInitialLinks(initialLinks);
    setLinks(initialLinks);
  }

  if (initialPhone !== prevInitialPhone) {
    setPrevInitialPhone(initialPhone);
    setPhone(initialPhone ?? "");
    setSavedPhone(initialPhone ?? "");
    phoneRef.current = initialPhone ?? "";
  }

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  async function persistPhone(next: string) {
    const trimmed = next.trim();
    const previous = phoneRef.current;
    if (trimmed === previous.trim()) return;

    phoneRef.current = trimmed;
    setSyncError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ phone: trimmed || null })
      .eq("id", profileId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      phoneRef.current = previous;
      setPhone(previous);
      setSavedPhone(previous);
      setSyncError(
        error?.message ??
          "Could not save phone number. You may not have permission.",
      );
      return;
    }

    setPhone(trimmed);
    setSavedPhone(trimmed);
  }

  async function persistLinks(next: ProfileLink[], previous: ProfileLink[]) {
    linksRef.current = next;
    setLinks(next);
    setSyncError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ profile_links: next })
      .eq("id", profileId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      linksRef.current = previous;
      setLinks(previous);
      setSyncError(
        error?.message ??
          "Could not save links. You may not have permission to update this profile.",
      );
    }
  }

  async function handleAdd(link: ProfileLink) {
    const previous = linksRef.current;
    await persistLinks([...previous, link], previous);
  }

  async function handleRemove(index: number) {
    const previous = linksRef.current;
    await persistLinks(
      previous.filter((_, itemIndex) => itemIndex !== index),
      previous,
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {email || savedPhone ? (
        <div className="flex text-sm gap-2">
          {email ? (
            <a href={`mailto:${email}`} className="flex items-center gap-1">
              <Mail size={14} /> {email}
            </a>
          ) : null}
          {email && savedPhone ? (
            <Separator orientation="vertical" />
          ) : null}
          {savedPhone ? (
            <a href={`tel:${savedPhone}`} className="flex items-center gap-1">
              <Phone size={14} />
              {savedPhone}
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2 text-sm">
        {links.map((item, index) => {
          const name = siteNameFromUrl(item.link);
          return (
            <Fragment key={`${item.link}-${index}`}>
              {index > 0 ? <Separator orientation="vertical" /> : null}
              <a
                href={toHref(item.link)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:underline"
              >
                <LinkFavicon url={item.link} name={name} />
                {name}
              </a>
            </Fragment>
          );
        })}
        {canEdit ? (
          <button
            type="button"
            aria-label="Add a social link"
            className="flex items-center gap-1.5 opacity-50 hover:cursor-pointer hover:opacity-100"
            onClick={() => setOpen(true)}
          >
            <PlusCircle size={15} />
            {links.length === 0 ? <span>Add a social link</span> : null}
          </button>
        ) : null}
      </div>
      {syncError ? (
        <p className="text-sm text-destructive">{syncError}</p>
      ) : null}
      {canEdit ? (
        <AddSocialLinkDialog
          open={open}
          onOpenChange={setOpen}
          links={links}
          phone={phone}
          onPhoneChange={setPhone}
          onPhoneCommit={(value) => void persistPhone(value)}
          onSubmit={handleAdd}
          onRemove={handleRemove}
        />
      ) : null}
    </div>
  );
}
