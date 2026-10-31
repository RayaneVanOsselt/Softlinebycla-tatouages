import Image from "next/image";

/** Logo officiel (détouré à partir du fichier fourni, sans modification du dessin). */
export function Monogram({ tone = "ink", className, priority }: { tone?: "ink" | "cream"; className?: string; priority?: boolean }) {
  return (
    <Image
      src={`/brand/monogram-${tone}.png`}
      alt=""
      width={277}
      height={364}
      className={className}
      priority={priority}
      sizes="80px"
    />
  );
}

export function Wordmark({ tone = "ink", className }: { tone?: "ink" | "cream"; className?: string }) {
  return <Image src={`/brand/wordmark-${tone}.png`} alt="SOFTLINEBY.CLA" width={431} height={51} className={className} sizes="240px" />;
}

export function FullLogo({ tone = "ink", className }: { tone?: "ink" | "cream"; className?: string }) {
  return <Image src={`/brand/logo-${tone}.png`} alt="SOFTLINEBY.CLA" width={471} height={498} className={className} sizes="(max-width: 768px) 50vw, 240px" />;
}
