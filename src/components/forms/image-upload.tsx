"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { ImagePreview } from "@/components/ui/smart-image";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type ImageUploadProps = {
  value?: string | null;
  onChange: (url: string | null) => void;
  label: string;
  id?: string;
};

/** Uploads through /api/uploads (server validates type, size, ownership). Falls back to URL input. */
export function ImageUpload({ value, onChange, label, id }: ImageUploadProps) {
  const t = useTranslations("upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFile(file: File) {
    if (!TYPES.includes(file.type)) return toast.error(t("invalidType"));
    if (file.size > MAX_BYTES) return toast.error(t("tooLarge"));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.status === 503) {
        setUrlMode(true);
        toast.info(t("unavailable"));
        return;
      }
      if (!res.ok || !json.url) throw new Error(json.error ?? "upload_failed");
      onChange(json.url);
      toast.success(t("success"));
    } catch {
      toast.error(t("failed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value && <ImagePreview src={value} alt={label} className="aspect-video w-full max-w-sm" />}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={fieldId}
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          aria-label={label}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button variant="outline" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? t("uploading") : value ? t("replace") : t("choose")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setUrlMode((v) => !v)}>
          {t("useUrl")}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t("remove")}
          </Button>
        )}
      </div>
      {urlMode && (
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-label={t("urlLabel")}
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
          />
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (!/^https:\/\//.test(urlDraft)) return toast.error(t("invalidUrl"));
              onChange(urlDraft);
              setUrlDraft("");
            }}
          >
            {t("apply")}
          </Button>
        </div>
      )}
      <p className="text-xs text-gray-500">{t("hint")}</p>
    </div>
  );
}
