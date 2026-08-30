"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  siteNameFromUrl,
  type ProfileLink,
} from "@/lib/profiles/profile-links";

function stripProtocol(value: string) {
  return value.trim().replace(/^https?:\/\//i, "");
}

const SOCIAL_PREFIXES = [
  {
    name: "Instagram",
    prefix: "www.instagram.com/",
    icon: "/instagram.png",
  },
  {
    name: "Facebook",
    prefix: "www.facebook.com/",
    icon: "/facebook.png",
  },
  {
    name: "X",
    prefix: "x.com/",
    icon: "/X.png",
  },
  {
    name: "LinkedIn",
    prefix: "www.linkedin.com/in/",
    icon: "/linkedin.png",
  },
  {
    name: "Reddit",
    prefix: "www.reddit.com/user/",
    icon: "/reddit.png",
  },
  {
    name: "TikTok",
    prefix: "www.tiktok.com/@",
    icon: "/tik-tok.png",
  },
  {
    name: "WhatsApp",
    prefix: "wa.me/",
    icon: "/whatsapp.png",
  },
] as const;

export function AddSocialLinkDialog({
  open,
  onOpenChange,
  links,
  onSubmit,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: ProfileLink[];
  onSubmit: (link: ProfileLink) => void | Promise<void>;
  onRemove: (index: number) => void | Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setError(null);
  }, [open]);

  function applyPrefix(prefix: string) {
    setUrl(prefix);
    setError(null);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      const pos = prefix.length;
      input.setSelectionRange(pos, pos);
    });
  }

  function handleSubmit() {
    const trimmedUrl = stripProtocol(url);

    if (!trimmedUrl) {
      setError("Enter a website URL.");
      return;
    }

    onOpenChange(false);
    void onSubmit({
      link: trimmedUrl,
      title: siteNameFromUrl(trimmedUrl),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add social links</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          {links.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {links.map((item, index) => {
                const name = siteNameFromUrl(item.link);
                return (
                  <Badge key={`${item.link}-${index}`} variant="secondary">
                    <button
                      type="button"
                      data-icon="inline-start"
                      aria-label={`Remove ${name}`}
                      className="inline-flex hover:cursor-pointer"
                      onClick={() => void onRemove(index)}
                    >
                      <X className="size-3" />
                    </button>
                    {name}
                  </Badge>
                );
              })}
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="social-link-url">Website URL</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="social-link-url"
                ref={inputRef}
                placeholder="Paste a website URL"
                value={url}
                onChange={(e) => setUrl(stripProtocol(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <InputGroupAddon>
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {SOCIAL_PREFIXES.map((social) => (
                <Button
                  key={social.name}
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="overflow-hidden p-0"
                  aria-label={`Fill ${social.name} URL`}
                  onClick={() => applyPrefix(social.prefix)}
                >
                  {/* Local PNG: plain img avoids next/image optimizer overhead */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={social.icon}
                    alt=""
                    width={28}
                    height={28}
                    className="size-full object-cover"
                  />
                </Button>
              ))}
            </div>
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="button" onClick={handleSubmit}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
