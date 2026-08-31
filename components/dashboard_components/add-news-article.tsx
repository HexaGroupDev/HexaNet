"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Plus, Upload, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const IMAGE_BUCKET = "news-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

export function AddNewsArticle({ trigger }: { trigger?: ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setBody("");
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const extension = getFileExtension(file);
    const typeOk =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.has(extension);

    if (!typeOk) {
      setError("Use a PNG, JPEG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadNewsImage(articleId: string, file: File) {
    const supabase = createClient();
    const extension = getFileExtension(file);
    const normalizedExtension = extension === "jpeg" ? "jpg" : extension || "jpg";
    const filePath = `${articleId}/hero.${normalizedExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);

    return `${publicUrl}?v=${Date.now()}`;
  }

  async function handlePublish() {
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      setError("A title is required.");
      return;
    }
    if (!trimmedBody) {
      setError("Body text is required.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to publish news.");
      }

      const articleId = crypto.randomUUID();
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadNewsImage(articleId, imageFile);
      }

      const { error: insertError } = await supabase.from("news_articles").insert({
        id: articleId,
        title: trimmedTitle,
        body: trimmedBody,
        image_url: imageUrl,
      });

      if (insertError) {
        throw new Error(
          insertError.message ??
            "Could not publish the article. You may not have permission.",
        );
      }

      handleOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Write news post"
          />
        }
      >
        {trigger ?? <Plus />}
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,820px)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Write a news post</DialogTitle>
          <DialogDescription>
            Publish an update to the company news feed.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              placeholder="Hexagroup opens a new wing dedicated entirely to nap pods"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Body</FieldLabel>
            <Textarea
              placeholder="Write the full article here."
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={pending}
              rows={12}
            />
          </Field>
          <Field>
            <FieldLabel>Hero image</FieldLabel>
            <input
              ref={inputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
              disabled={pending}
            />
            {imagePreviewUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="aspect-[16/5] w-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label="Remove image"
                  disabled={pending}
                  className="absolute top-2 right-2"
                  onClick={clearImage}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:cursor-pointer hover:bg-muted/50 disabled:cursor-wait"
              >
                <ImageIcon className="size-5 opacity-60" />
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Upload className="size-4" />
                  Add image
                </span>
                <span className="text-xs">PNG, JPEG, or WEBP up to 5 MB</span>
              </button>
            )}
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose disabled={pending} render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void handlePublish()}
          >
            {pending ? <Spinner /> : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
