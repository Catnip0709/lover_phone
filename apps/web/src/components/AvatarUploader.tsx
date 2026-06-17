import { Camera, Loader2 } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { uploadAvatar, resolveAssetUrl } from "@/api/users";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  accessToken: string;
  value: string | null;
  fallbackText: string;
  onChange: (url: string | null) => void;
  onError?: (message: string) => void;
};

export function AvatarUploader({ accessToken, value, fallbackText, onChange, onError }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = resolveAssetUrl(value);

  async function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (file.size > MAX_BYTES) {
      onError?.("图片不能超过 2MB");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const { url } = await uploadAvatar(accessToken, dataUrl);
      onChange(url);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {previewUrl ? (
          <img
            alt="头像"
            className="h-24 w-24 rounded-full object-cover shadow-[0_8px_24px_rgba(148,163,184,0.2)] ring-4 ring-white/70"
            src={previewUrl}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(145deg,#dbeafe,#93c5fd)] text-3xl font-semibold text-white shadow-[0_8px_24px_rgba(148,163,184,0.2)] ring-4 ring-white/70">
            {fallbackText[0] ?? "我"}
          </div>
        )}
        <button
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg disabled:opacity-50"
          disabled={uploading}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input
          accept={ACCEPT}
          className="hidden"
          ref={inputRef}
          type="file"
          onChange={handleSelect}
        />
      </div>
      <p className="text-xs text-slate-400">点击相机图标上传头像</p>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("读取失败"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("读取失败"));
    reader.readAsDataURL(file);
  });
}
