/**
 * Chargeur d'images pour l'export statique : les photos du portfolio sont pré-optimisées
 * (scripts/build-media.ts) en WebP 480 / 828 / 1200 / 1800 px ; on sert la plus proche de la taille demandée.
 */
const WIDTHS = [480, 828, 1200, 1800];

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  if (/^(https?:|data:)/.test(src)) return src;
  const m = /^\/portfolio\/(.+)\.jpe?g$/i.exec(src);
  if (m) {
    const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
    return `${base}/portfolio/${m[1]}-${w}.webp`;
  }
  return `${base}${src}?w=${width}`;
}
