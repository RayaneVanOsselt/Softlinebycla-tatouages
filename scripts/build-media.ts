/**
 * Optimise automatiquement les photos et vidéos du portfolio (lancé avant chaque build et en développement).
 *
 * Entrée  : content/photos/  (JPG, PNG, WebP, MP4…) — déposez simplement vos fichiers ici, même depuis GitHub.
 * Sortie  : public/portfolio/  (WebP en 4 largeurs + JPEG de partage + vidéos)
 *           src/content/media.generated.json (dimensions + aperçu flou)
 *
 * Les photos ne sont ni retouchées ni déformées : seules les bandes noires éventuelles autour de l'image
 * (captures d'écran de stories) sont retirées. Traitement incrémental : un fichier déjà optimisé est ignoré.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "content/photos");
const OUT = path.join(ROOT, "public/portfolio");
const MANIFEST = path.join(ROOT, "src/content/media.generated.json");
export const WIDTHS = [480, 828, 1200, 1800];

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const VIDEO = /\.(mp4|webm|mov|m4v)$/i;

type Entry = { kind: "image" | "video"; src: string; poster?: string; width: number; height: number; blurDataUrl?: string };

const idOf = (file: string) =>
  file
    .replace(/\.poster\.[^.]+$/i, "-poster")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const newer = (a: string, b: string) => fs.existsSync(b) && fs.statSync(b).mtimeMs >= fs.statSync(a).mtimeMs;

async function isLetterboxed(file: string) {
  const { data } = await sharp(file).rotate().extract({ left: 0, top: 0, width: 16, height: 16 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (const v of data) sum += v;
  return sum / data.length < 12;
}

async function processImage(file: string, id: string, previous?: Entry): Promise<Entry> {
  const largest = path.join(OUT, `${id}-${WIDTHS[WIDTHS.length - 1]}.webp`);
  if (previous && newer(file, largest)) return previous;

  let base = sharp(file).rotate();
  if (await isLetterboxed(file)) base = sharp(await base.trim({ background: "#000000", threshold: 28 }).toBuffer());
  const buf = await base.toBuffer();
  const meta = await sharp(buf).metadata();
  for (const w of WIDTHS) {
    await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(OUT, `${id}-${w}.webp`));
  }
  // JPEG pour les aperçus de partage (réseaux sociaux)
  await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, `${id}.jpg`));
  const blur = await sharp(buf).resize(16).jpeg({ quality: 50 }).toBuffer();
  const scale = Math.min(1, WIDTHS[WIDTHS.length - 1]! / (meta.width ?? 1));
  return {
    kind: "image",
    src: `/portfolio/${id}.jpg`,
    width: Math.round((meta.width ?? 1) * scale),
    height: Math.round((meta.height ?? 1) * scale),
    blurDataUrl: `data:image/jpeg;base64,${blur.toString("base64")}`,
  };
}

function extractFrame(video: string): string | null {
  try {
    const tmp = path.join(os.tmpdir(), `poster-${Date.now()}.jpg`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.5", "-i", video, "-frames:v", "1", tmp]);
    return fs.existsSync(tmp) ? tmp : null;
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const previous: Record<string, Entry> = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
  const files = fs.readdirSync(SRC).filter((f) => !f.startsWith(".")).sort();
  const manifest: Record<string, Entry> = {};
  let processed = 0;

  for (const f of files) {
    const full = path.join(SRC, f);
    if (/\.poster\./i.test(f)) continue; // traité avec sa vidéo
    if (IMAGE.test(f)) {
      const before = previous[f];
      manifest[f] = await processImage(full, idOf(f), before);
      if (manifest[f] !== before) processed++;
    } else if (VIDEO.test(f)) {
      const id = idOf(f);
      const ext = f.split(".").pop()!.toLowerCase() === "mov" ? "mp4" : f.split(".").pop()!.toLowerCase();
      const target = path.join(OUT, `${id}.${ext}`);
      if (!newer(full, target)) fs.copyFileSync(full, target);
      const posterFile = files.find((p) => p.toLowerCase().startsWith(`${f.replace(/\.[^.]+$/, "").toLowerCase()}.poster.`));
      const posterSrc = posterFile ? path.join(SRC, posterFile) : extractFrame(full);
      if (!posterSrc) {
        console.warn(`⚠︎ ${f} : aucune image de couverture (ajoutez ${f.replace(/\.[^.]+$/, "")}.poster.jpg dans content/photos).`);
        continue;
      }
      const poster = await processImage(posterSrc, `${id}-poster`, previous[f] ? { ...previous[f], src: `/portfolio/${id}-poster.jpg` } : undefined);
      manifest[f] = { kind: "video", src: `/portfolio/${id}.${ext}`, poster: poster.src, width: poster.width, height: poster.height, blurDataUrl: poster.blurDataUrl };
      processed++;
    } else {
      console.warn(`⚠︎ Format ignoré : ${f} (utilisez JPG, PNG, WebP ou MP4).`);
    }
  }

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Portfolio : ${Object.keys(manifest).length} média(s) prêts (${processed} optimisé(s) maintenant).`);
}

await main();
