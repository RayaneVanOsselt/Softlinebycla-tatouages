import Image from "next/image";
import type { PublicMedia } from "@/lib/content/portfolio";

/** Image du portfolio : jamais déformée (object-fit cover + point focal), placeholder flou, formats AVIF/WebP. */
export function MediaImage({
  media,
  sizes,
  className = "",
  priority,
  fill = true,
  quality = 75,
}: {
  media: PublicMedia;
  sizes: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  quality?: number;
}) {
  const src = media.kind === "video" ? (media.posterUrl ?? media.url) : media.url;
  const common = {
    src,
    alt: media.alt,
    sizes,
    priority,
    quality,
    placeholder: media.blurDataUrl ? ("blur" as const) : ("empty" as const),
    blurDataURL: media.blurDataUrl ?? undefined,
    style: { objectPosition: `${media.focalX}% ${media.focalY}%` },
  };
  return fill ? (
    <Image {...common} fill className={`object-cover ${className}`} />
  ) : (
    <Image {...common} width={media.width} height={media.height} className={className} />
  );
}
