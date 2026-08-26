"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Upload, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic",
  "heif",
]);

function isHeicFile(file: File, extension: string) {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    extension === "heic" ||
    extension === "heif"
  );
}

async function toUploadableImage(file: File, extension: string) {
  if (!isHeicFile(file, extension)) {
    return {
      blob: file,
      contentType: file.type || "image/jpeg",
      extension: extension === "jpeg" ? "jpg" : extension || "jpg",
    };
  }

  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  return {
    blob,
    contentType: "image/jpeg",
    extension: "jpg",
  };
}

const PHOTO_FRAME_CLASS =
  "relative h-44 w-full overflow-hidden rounded-md bg-muted md:h-[250px] md:w-[200px]";

export function ProfilePhotoUpload({
  profileId,
  initialUrl,
  editable = true,
}: {
  profileId: string;
  initialUrl: string | null;
  editable?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedUrlRef = useRef(initialUrl);

  async function removeStoredPhotos() {
    const supabase = createClient();
    const { data: existing, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(profileId);

    if (listError) {
      throw new Error(listError.message);
    }

    const paths = (existing ?? []).map((item) => `${profileId}/${item.name}`);
    if (paths.length === 0) return;

    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);
    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (uploading || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      await removeStoredPhotos();

      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo_url: null })
        .eq("id", profileId)
        .select("id")
        .maybeSingle();

      if (updateError || !data) {
        throw new Error(
          updateError?.message ??
            "Could not remove photo. You may not have permission.",
        );
      }

      savedUrlRef.current = null;
      setPreviewUrl(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove photo.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const sourceExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const typeOk =
      ALLOWED_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.has(sourceExtension);

    if (!typeOk) {
      setError("Use a PNG, JPEG, WEBP, or HEIC image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    let localPreview: string | null = null;

    try {
      const uploadable = await toUploadableImage(file, sourceExtension);
      localPreview = URL.createObjectURL(uploadable.blob);
      setPreviewUrl(localPreview);

      const supabase = createClient();
      const filePath = `${profileId}/photo.${uploadable.extension}`;

      const { data: existing, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(profileId);

      if (listError) {
        throw new Error(listError.message);
      }

      const stalePaths = (existing ?? [])
        .map((item) => `${profileId}/${item.name}`)
        .filter((path) => path !== filePath);

      if (stalePaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(stalePaths);
        if (removeError) {
          throw new Error(removeError.message);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, uploadable.blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: uploadable.contentType,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      const urlWithVersion = `${publicUrl}?v=${Date.now()}`;

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo_url: urlWithVersion })
        .eq("id", profileId)
        .select("id")
        .maybeSingle();

      if (updateError || !data) {
        throw new Error(
          updateError?.message ??
            "Could not save photo. You may not have permission.",
        );
      }

      setPreviewUrl(urlWithVersion);
      savedUrlRef.current = urlWithVersion;
      router.refresh();
    } catch (err) {
      setPreviewUrl(savedUrlRef.current);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setUploading(false);
      event.target.value = "";
    }
  }

  if (!previewUrl && !editable) {
    return null;
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif"
      className="hidden"
      onChange={(e) => void handleFileChange(e)}
    />
  );

  const photo = previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewUrl}
      alt="Profile photo"
      className={`size-full object-cover transition-[filter] duration-200 ${
        editable && (uploading || deleting)
          ? "brightness-50"
          : editable
            ? "group-hover:brightness-50"
            : ""
      }`}
    />
  ) : (
    <div
      className={`flex size-full items-center justify-center transition-[filter] duration-200 ${
        uploading ? "brightness-50" : "group-hover:brightness-50"
      }`}
    >
      <ImageIcon className="size-8 text-muted-foreground opacity-40" />
    </div>
  );

  if (!editable) {
    return (
      <div className={`md:w-auto md:shrink-0 ${PHOTO_FRAME_CLASS}`}>{photo}</div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1 md:w-auto md:shrink-0">
      {fileInput}
      <div className={`group ${PHOTO_FRAME_CLASS}`}>
        <button
          type="button"
          aria-label="Upload profile photo"
          disabled={uploading || deleting}
          className="size-full cursor-pointer disabled:cursor-wait"
          onClick={() => {
            setError(null);
            inputRef.current?.click();
          }}
        >
          {photo}
          <span
            className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
              uploading || deleting
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {uploading || deleting ? (
              <Spinner className="size-6 text-white" />
            ) : (
              <Upload className="size-6 text-white drop-shadow" />
            )}
          </span>
        </button>
        {previewUrl ? (
          <Tooltip>
            <TooltipTrigger
              disabled={uploading || deleting}
              render={
                <button
                  type="button"
                  aria-label="Remove profile photo"
                  disabled={uploading || deleting}
                  className="absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/65 text-white opacity-0 pointer-events-none transition-opacity hover:cursor-pointer hover:bg-black/80 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 group-hover:pointer-events-auto group-hover:opacity-100 disabled:cursor-wait"
                  onClick={(event) => void handleDelete(event)}
                />
              }
            >
              <X className="size-3.5" strokeWidth={2.5} />
            </TooltipTrigger>
            <TooltipContent>Remove photo</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-destructive md:max-w-[200px]">{error}</p>
      ) : null}
    </div>
  );
}
