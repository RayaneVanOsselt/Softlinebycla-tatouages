"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Close, Image as ImageIcon } from "../ui/icons";

export interface PreparedFile {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

const MAX_FILES = 3;
const MAX_SIDE = 1800;
const MAX_BYTES = 1.3 * 1024 * 1024; // 3 images ≤ 4 Mo au total (limite des fonctions Vercel : 4,5 Mo)

/** Compression dans le navigateur (≤ 1800 px, JPEG) : envoi rapide et respect de la limite serveur. Les métadonnées EXIF (GPS…) disparaissent. */
async function prepare(file: File): Promise<PreparedFile> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("file_type");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("file_type");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("file_type");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let quality = 0.84;
  let blob: Blob | null = null;
  for (let i = 0; i < 4; i++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) break;
    quality -= 0.14;
  }
  if (!blob || blob.size > MAX_BYTES) throw new Error("file_size");
  return { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, "") + ".jpg", blob, url: URL.createObjectURL(blob), width: w, height: h };
}

export function ReferenceUploader({ files, onChange }: { files: PreparedFile[]; onChange: (files: PreparedFile[]) => void }) {
  const t = useTranslations("booking.form");
  const e = useTranslations("booking.errors");
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const room = MAX_FILES - files.length;
    if (list.length > room) setError(e("file_count"));
    setBusy(true);
    const next = [...files];
    for (const f of [...list].slice(0, Math.max(0, room))) {
      try {
        next.push(await prepare(f));
      } catch (err) {
        setError(e((err as Error).message === "file_size" ? "file_size" : "file_type"));
      }
    }
    setBusy(false);
    onChange(next);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="field">
      <span className="field-label" id="refs-label">
        {t("references")} <span className="opt">({t("optional")})</span>
      </span>
      <p className="field-hint" id="refs-hint">
        {t("referencesHint")}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {files.map((f) => (
          <div key={f.id} className="relative size-24 overflow-hidden rounded-xl border border-line-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(f.url);
                onChange(files.filter((x) => x.id !== f.id));
              }}
              aria-label={t("removeImage", { name: f.name })}
              className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-ivory/90 text-chocolate"
            >
              <Close size={14} />
            </button>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <label className={`flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-light-brown text-center text-[0.68rem] font-semibold text-fg-muted transition-colors hover:border-chocolate hover:text-chocolate ${busy ? "opacity-50" : ""}`}>
            <ImageIcon size={20} />
            <span className="px-1">{t("addImages")}</span>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              aria-labelledby="refs-label"
              aria-describedby="refs-hint"
              disabled={busy}
              onChange={(ev) => add(ev.target.files)}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
