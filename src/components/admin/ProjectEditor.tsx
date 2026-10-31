"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addMediaAction,
  deleteMediaAction,
  deleteProjectAction,
  reorderMediaAction,
  saveProjectAction,
  updateMediaAction,
} from "@/app/admin/actions";
import { AdminButton, Feedback, inputCls, labelCls, Panel, useAction } from "./ui";

type L = { fr: string; nl: string; en: string };
const LANGS = [
  ["fr", "Français"],
  ["nl", "Nederlands"],
  ["en", "English"],
] as const;

export interface EditorMedia {
  id: string;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  alt: L;
  focalX: number;
  focalY: number;
}

export interface EditorProject {
  id: string | null;
  slug: string;
  title: L;
  description: L;
  categoryId: string | null;
  year: number | null;
  featured: boolean;
  published: boolean;
  media: EditorMedia[];
}

/* ───────── Préparation des fichiers dans le navigateur ───────── */

async function imageMeta(file: Blob) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const w = 16;
  canvas.width = w;
  canvas.height = Math.max(1, Math.round((bmp.height / bmp.width) * w));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const meta = { width: bmp.width, height: bmp.height, blurDataUrl: canvas.toDataURL("image/jpeg", 0.5) };
  bmp.close();
  return meta;
}

/** Miniature (poster) extraite de la vidéo : première image nette. */
async function videoPoster(file: File): Promise<{ poster: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res();
      video.onerror = () => rej(new Error("Vidéo illisible par le navigateur (préférez le format MP4)."));
    });
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    await new Promise<void>((res) => (video.onseeked = () => res()));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const poster = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Poster impossible"))), "image/jpeg", 0.85));
    return { poster, width: video.videoWidth, height: video.videoHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadFile(file: Blob, name: string, blob: boolean): Promise<string> {
  if (blob) {
    const res = await upload(`portfolio/${name}`, file, { access: "public", handleUploadUrl: "/api/admin/upload", multipart: file.size > 8 * 1024 * 1024 });
    return res.url;
  }
  const fd = new FormData();
  fd.append("file", file, name);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; message?: string; code?: string };
  if (!res.ok || !json.url) throw new Error(json.message ?? json.code ?? "Envoi impossible");
  return json.url;
}

export function ProjectEditor({ project, categories, blobEnabled }: { project: EditorProject; categories: Array<{ id: string; name: string }>; blobEnabled: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(project);
  const [lang, setLang] = useState<"fr" | "nl" | "en">("fr");
  const save = useAction();
  const media = useAction();
  const [uploading, setUploading] = useState<string | null>(null);

  // Après un ajout/suppression côté serveur, on reprend la liste des médias sans perdre le texte en cours d'édition
  useEffect(() => setP((prev) => ({ ...prev, media: project.media })), [project.media]);

  const setL = (field: "title" | "description", value: string) => setP({ ...p, [field]: { ...p[field], [lang]: value } });

  const onSave = () =>
    save.run(async () => {
      const r = await saveProjectAction(p.id, { slug: p.slug, title: p.title, description: p.description, categoryId: p.categoryId, year: p.year, featured: p.featured, published: p.published });
      if (r.ok && !p.id && "id" in r && r.id) router.replace(`/admin/portfolio/${r.id}`);
      else router.refresh();
      return r;
    });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || !p.id) return;
    media.setResult(null);
    for (const file of [...files]) {
      try {
        setUploading(file.name);
        const base = `${Date.now()}-${file.name.normalize("NFD").replace(/[^\w.-]+/g, "-").toLowerCase()}`;
        if (file.type.startsWith("video/")) {
          const { poster, width, height } = await videoPoster(file);
          const [url, posterUrl] = await Promise.all([uploadFile(file, base, blobEnabled), uploadFile(poster, `${base}-poster.jpg`, blobEnabled)]);
          const { blurDataUrl } = await imageMeta(poster);
          const r = await addMediaAction(p.id, { kind: "video", url, posterUrl, width, height, blurDataUrl });
          if (!r.ok) throw new Error(r.error);
        } else if (file.type.startsWith("image/")) {
          const meta = await imageMeta(file);
          const url = await uploadFile(file, base, blobEnabled);
          const r = await addMediaAction(p.id, { kind: "image", url, posterUrl: null, ...meta });
          if (!r.ok) throw new Error(r.error);
        } else throw new Error(`Format non pris en charge : ${file.name}`);
      } catch (e) {
        media.setResult({ ok: false, error: e instanceof Error ? e.message : "Envoi impossible" });
        break;
      } finally {
        setUploading(null);
      }
    }
    router.refresh();
  };

  const moveMedia = (i: number, d: number) => {
    const list = [...p.media];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    setP({ ...p, media: list });
    media.run(() => reorderMediaAction(p.id!, list.map((m) => m.id)));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Panel title="Informations">
        <div role="tablist" aria-label="Langue" className="mb-4 flex gap-1">
          {LANGS.map(([code, label]) => (
            <button key={code} type="button" role="tab" aria-selected={lang === code} onClick={() => setLang(code)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lang === code ? "bg-nut text-ivory" : "border border-line"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className={labelCls}>
              Titre ({lang.toUpperCase()}) {lang === "fr" && "*"}
            </label>
            <input id="title" value={p.title[lang]} onChange={(e) => setL("title", e.target.value)} className={inputCls} maxLength={120} />
          </div>
          <div>
            <label htmlFor="desc" className={labelCls}>
              Description ({lang.toUpperCase()})
            </label>
            <textarea id="desc" rows={4} value={p.description[lang]} onChange={(e) => setL("description", e.target.value)} className={inputCls} maxLength={2000} />
            <p className="mt-1 text-xs text-fg-muted">Ne mentionnez aucune information personnelle sur le client.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="cat" className={labelCls}>
                Catégorie
              </label>
              <select id="cat" value={p.categoryId ?? ""} onChange={(e) => setP({ ...p, categoryId: e.target.value || null })} className={inputCls}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className={labelCls}>
                Année (facultatif)
              </label>
              <input id="year" type="number" min={1990} max={2100} value={p.year ?? ""} onChange={(e) => setP({ ...p, year: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </div>
            <div>
              <label htmlFor="slug" className={labelCls}>
                Adresse (slug)
              </label>
              <input id="slug" value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} placeholder="auto" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={p.published} onChange={(e) => setP({ ...p, published: e.target.checked })} className="size-4 accent-[var(--color-nut)]" /> Publié sur le site
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={p.featured} onChange={(e) => setP({ ...p, featured: e.target.checked })} className="size-4 accent-[var(--color-nut)]" /> Mis en avant sur l’accueil
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <AdminButton pending={save.pending} onClick={onSave}>
              {p.id ? "Enregistrer" : "Créer le projet"}
            </AdminButton>
            {p.id && (
              <AdminButton
                variant="danger"
                onClick={() => {
                  if (confirm("Supprimer définitivement ce projet et ses médias ?")) save.run(() => deleteProjectAction(p.id!), () => router.push("/admin/portfolio"));
                }}
              >
                Supprimer le projet
              </AdminButton>
            )}
          </div>
          <Feedback result={save.result} />
        </div>
      </Panel>

      <Panel title="Photos & vidéos">
        {!p.id ? (
          <p className="text-sm text-fg-muted">Créez d’abord le projet pour pouvoir ajouter des médias.</p>
        ) : (
          <>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-light-brown p-4 text-center text-sm hover:border-nut">
              <span className="font-semibold">{uploading ? `Envoi de ${uploading}…` : "Ajouter des photos ou vidéos"}</span>
              <span className="text-xs text-fg-muted">JPG, PNG, WebP, MP4. Les images ne sont jamais recadrées ni retouchées.</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" className="sr-only" disabled={Boolean(uploading)} onChange={(e) => onFiles(e.target.files)} />
            </label>
            {!blobEnabled && <p className="mt-2 text-xs text-fg-muted">Mode local : fichiers enregistrés dans public/uploads (configurez Vercel Blob pour la production).</p>}
            <div className="mt-3">
              <Feedback result={media.result} />
            </div>
            <ul className="mt-4 space-y-4">
              {p.media.map((m, i) => (
                <MediaRow key={m.id} m={m} first={i === 0} onUp={() => moveMedia(i, -1)} onDown={() => moveMedia(i, 1)} canUp={i > 0} canDown={i < p.media.length - 1} onChanged={() => router.refresh()} />
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}

function MediaRow({ m, first, onUp, onDown, canUp, canDown, onChanged }: { m: EditorMedia; first: boolean; onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean; onChanged: () => void }) {
  const [alt, setAlt] = useState(m.alt);
  const [focal, setFocal] = useState({ x: m.focalX, y: m.focalY });
  const a = useAction();
  const thumb = m.kind === "video" ? (m.posterUrl ?? "") : m.url;
  return (
    <li className="rounded-xl border border-line-soft p-3">
      <div className="flex gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} />}
          {m.kind === "video" && <span className="absolute bottom-1 left-1 rounded bg-ivory/90 px-1 text-[0.6rem] font-bold">VIDÉO</span>}
          {first && <span className="absolute top-1 left-1 rounded bg-nut px-1 text-[0.6rem] font-bold text-ivory">COUVERTURE</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {(["fr", "nl", "en"] as const).map((l) => (
            <input key={l} aria-label={`Texte alternatif ${l.toUpperCase()}`} placeholder={`Description de l’image (${l.toUpperCase()})`} value={alt[l]} onChange={(e) => setAlt({ ...alt, [l]: e.target.value })} className={`${inputCls} py-1.5 text-sm`} />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <label>
          Cadrage horizontal ({focal.x}%)
          <input type="range" min={0} max={100} value={focal.x} onChange={(e) => setFocal({ ...focal, x: Number(e.target.value) })} className="w-full accent-[var(--color-nut)]" />
        </label>
        <label>
          Cadrage vertical ({focal.y}%)
          <input type="range" min={0} max={100} value={focal.y} onChange={(e) => setFocal({ ...focal, y: Number(e.target.value) })} className="w-full accent-[var(--color-nut)]" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AdminButton variant="ghost" className="min-h-8 px-3 text-xs" pending={a.pending} onClick={() => a.run(() => updateMediaAction(m.id, { alt, focalX: focal.x, focalY: focal.y }))}>
          Enregistrer
        </AdminButton>
        <AdminButton variant="ghost" className="min-h-8 px-3 text-xs" disabled={!canUp} onClick={onUp} aria-label="Monter">
          ↑
        </AdminButton>
        <AdminButton variant="ghost" className="min-h-8 px-3 text-xs" disabled={!canDown} onClick={onDown} aria-label="Descendre">
          ↓
        </AdminButton>
        <AdminButton
          variant="subtle"
          className="ml-auto text-xs"
          onClick={() => {
            if (confirm("Supprimer ce média ?")) a.run(() => deleteMediaAction(m.id), onChanged);
          }}
        >
          Supprimer
        </AdminButton>
      </div>
      <div className="mt-2">
        <Feedback result={a.result} />
      </div>
    </li>
  );
}
