"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { MAX_UPLOAD_BYTES } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  roomId: string;
  disabled?: boolean;
  onUploaded: () => void;
};

export function ImageUploader({ roomId, disabled, onUploaded }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploaderName, setUploaderName] = useState("");

  const uploadFile = useCallback(
    async (file: File, cap: string, name: string) => {
      setError(null);
      setProgress(0);
      const form = new FormData();
      form.append("file", file);
      form.append("room_id", roomId);
      form.append("caption", cap);
      form.append("uploader_name", name);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/images/upload");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
          } else {
            try {
              const j = JSON.parse(xhr.responseText);
              reject(new Error(j.error ?? "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(form);
      });

      onUploaded();
      setTimeout(() => setProgress(null), 800);
    },
    [roomId, onUploaded]
  );

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("Max file size is 20MB.");
        return;
      }
      try {
        await uploadFile(file, caption, uploaderName);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setProgress(null);
      }
    },
    [uploadFile, caption, uploaderName]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: disabled || progress !== null,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/heic": [".heic"],
      "image/heif": [".heif"],
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-slate-500">
          Caption (optional)
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/35 focus:ring-1 focus:ring-cyan-400/25"
            placeholder="e.g. Stage repaint"
          />
        </label>
        <label className="block text-xs text-slate-500">
          Your name (optional)
          <input
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/35 focus:ring-1 focus:ring-cyan-400/25"
            placeholder="e.g. Sam"
          />
        </label>
      </div>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.03] px-5 py-7 text-center text-sm text-slate-400 shadow-inner shadow-black/20 transition duration-300 hover:border-cyan-400/35 hover:bg-cyan-500/[0.06]",
          isDragActive && "border-cyan-400/45 bg-cyan-500/[0.08] shadow-cyan-500/10",
          (disabled || progress !== null) && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <p className="font-medium text-slate-200">Drop files or click to upload</p>
        <p className="mt-1 text-xs text-slate-500">
          JPG, PNG, PDF, HEIC · up to 20MB
        </p>
      </div>
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500/90 to-sky-500/80 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
