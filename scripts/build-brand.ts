/**
 * Régénère les déclinaisons du logo officiel (ressources/Logo Officiel .jpg) dans public/brand :
 * version encre, version crème pour fonds sombres, monogramme seul, mot-symbole, favicons, image de partage.
 * Le dessin du logo n'est pas modifié : seul le fond papier est rendu transparent.
 *
 * Usage (rarement nécessaire) : npm run brand:build
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "ressources");
const PUBLIC = path.join(ROOT, "public");

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

await prepareBrand();
console.log("Logos et icônes régénérés dans public/brand.");
