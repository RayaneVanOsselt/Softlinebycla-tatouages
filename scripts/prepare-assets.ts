/**
 * Prépare les médias publics à partir du dossier `ressources/` :
 * - logo officiel détouré (version encre + version crème pour fonds sombres), monogramme, favicons ;
 * - photos de tatouages : suppression des bandes noires éventuelles (letterbox), redimensionnement,
 *   compression — l'image du tatouage elle-même n'est ni retouchée ni déformée ;
 * - génère `src/content/media-manifest.json` (dimensions + placeholder flou).
 *
 * Usage : npm run assets:prepare
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "ressources");
const PUBLIC = path.join(ROOT, "public");
const MANIFEST = path.join(ROOT, "src/content/media-manifest.json");

const INK = { r: 0x14, g: 0x10, b: 0x0d };
const CREAM = { r: 0xe2, g: 0xd1, b: 0xc2 };

type Rgb = { r: number; g: number; b: number };

async function logoToAlpha(file: string, color: Rgb) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const lum = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    // fond papier ≈ 248 → transparent ; trait noir → opaque
    const a = Math.max(0, Math.min(1, (238 - lum) / 200));
    out[j] = color.r;
    out[j + 1] = color.g;
    out[j + 2] = color.b;
    out[j + 3] = Math.round(Math.pow(a, 0.85) * 255);
  }
  return { buffer: out, width: info.width, height: info.height };
}

function inkBounds(buf: Buffer, width: number, height: number, yFrom: number, yTo: number) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = yFrom; y < yTo; y++) {
    for (let x = 0; x < width; x++) {
      if (buf[(y * width + x) * 4 + 3]! > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function prepareBrand() {
  const dir = path.join(PUBLIC, "brand");
  await fs.mkdir(dir, { recursive: true });
  const src = path.join(SRC, "Logo Officiel .jpg");

  for (const [name, color] of [["ink", INK], ["cream", CREAM]] as const) {
    const { buffer, width, height } = await logoToAlpha(src, color);
    const raw = { raw: { width, height, channels: 4 as const } };
    const full = inkBounds(buffer, width, height, 0, height);
    const pad = 24;
    await sharp(buffer, raw)
      .extract({
        left: Math.max(0, full.left - pad),
        top: Math.max(0, full.top - pad),
        width: Math.min(width - Math.max(0, full.left - pad), full.width + pad * 2),
        height: Math.min(height - Math.max(0, full.top - pad), full.height + pad * 2),
      })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, `logo-${name}.png`));

    // Monogramme seul (au-dessus du mot-symbole, qui commence vers y≈470)
    const mono = inkBounds(buffer, width, height, 0, 455);
    await sharp(buffer, raw)
      .extract({ left: mono.left - 6, top: mono.top - 6, width: mono.width + 12, height: mono.height + 12 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, `monogram-${name}.png`));

    // Mot-symbole seul
    const word = inkBounds(buffer, width, height, 455, height);
    await sharp(buffer, raw)
      .extract({ left: word.left - 4, top: word.top - 4, width: word.width + 8, height: word.height + 8 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, `wordmark-${name}.png`));
  }

  // Icônes : monogramme encre sur papier ivoire du logo
  const mono = path.join(dir, "monogram-ink.png");
  const ivory = { r: 0xfb, g: 0xf8, b: 0xf3, alpha: 1 };
  const icon = async (size: number, out: string, inset = 0.14) => {
    const inner = Math.round(size * (1 - inset * 2));
    const m = await sharp(mono).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: ivory } })
      .composite([{ input: m, gravity: "center" }])
      .png()
      .toFile(out);
  };
  await icon(512, path.join(ROOT, "src/app/icon.png"), 0.1);
  await icon(180, path.join(ROOT, "src/app/apple-icon.png"), 0.14);
  await icon(512, path.join(dir, "icon-512.png"), 0.12);
  await icon(192, path.join(dir, "icon-192.png"), 0.12);

  // Image Open Graph 1200×630 : logo officiel centré sur papier ivoire
  const logo = await sharp(path.join(dir, "logo-ink.png")).resize({ height: 440 }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: ivory } })
    .composite([{ input: logo, gravity: "center" }])
    .jpeg({ quality: 90 })
    .toFile(path.join(dir, "og-default.jpg"));
}

async function isLetterboxed(file: string) {
  const { data } = await sharp(file).extract({ left: 0, top: 0, width: 24, height: 24 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (const v of data) sum += v;
  return sum / data.length < 12;
}

async function blurDataUrl(input: Sharp) {
  const buf = await input.clone().resize(16).jpeg({ quality: 50 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function preparePortfolio() {
  const srcDir = path.join(SRC, "Vidéo & images de tatouages");
  const outDir = path.join(PUBLIC, "portfolio");
  await fs.mkdir(outDir, { recursive: true });
  const manifest: Record<string, { src: string; width: number; height: number; blurDataUrl?: string; poster?: string; kind: "image" | "video" }> = {};

  const files = (await fs.readdir(srcDir)).sort();
  for (const f of files) {
    const full = path.join(srcDir, f);
    if (/\.jpe?g$/i.test(f)) {
      const id = f.replace(/\.[^.]+$/, "").toLowerCase().replace(/_/g, "-");
      let img = sharp(full).rotate();
      if (await isLetterboxed(full)) {
        const trimmed = await img.trim({ background: "#000000", threshold: 28 }).toBuffer();
        img = sharp(trimmed);
      }
      const resized = img.resize({ height: 1800, width: 1800, fit: "inside", withoutEnlargement: true });
      const out = path.join(outDir, `${id}.jpg`);
      const info = await resized.clone().jpeg({ quality: 86, mozjpeg: true }).toFile(out);
      manifest[id] = {
        kind: "image",
        src: `/portfolio/${id}.jpg`,
        width: info.width,
        height: info.height,
        blurDataUrl: await blurDataUrl(resized),
      };
    }
  }

  // Vidéos : déjà encodées en H.264 → simple copie en .mp4 + poster
  const videos: Array<{ file: string; id: string; poster: string }> = [
    { file: "08FD11B6-B30D-4702-9DE9-6C477ACF805F.MOV", id: "video-floral-forearm", poster: "poster-floral-forearm.jpg" },
    { file: "90B47498-93F9-4816-97E5-64EDE975C94C.MOV", id: "video-dagger-study", poster: "poster-dagger-study.jpg" },
  ];
  for (const v of videos) {
    const target = path.join(outDir, `${v.id}.mp4`);
    await fs.copyFile(path.join(srcDir, v.file), target);
    const posterSrc = path.join(ROOT, "ressources/.posters", v.poster);
    const exists = await fs.stat(posterSrc).then(() => true).catch(() => false);
    if (!exists) {
      console.warn(`Poster manquant pour ${v.id} (${posterSrc}). Générez-le puis relancez.`);
      continue;
    }
    const p = sharp(posterSrc);
    const info = await p.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(outDir, v.poster));
    manifest[v.id] = {
      kind: "video",
      src: `/portfolio/${v.id}.mp4`,
      poster: `/portfolio/${v.poster}`,
      width: info.width,
      height: info.height,
      blurDataUrl: await blurDataUrl(p),
    };
  }

  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${Object.keys(manifest).length} médias préparés.`);
}

await prepareBrand();
await preparePortfolio();
