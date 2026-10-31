import type { ReactNode } from "react";

/** En-tête éditorial des pages intérieures. */
export function PageHeading({ eyebrow, title, accent, children }: { eyebrow: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <header className="container-site pt-[calc(var(--header-h)+3.5rem)] pb-12 md:pt-[calc(var(--header-h)+6rem)] md:pb-16">
      <p className="eyebrow hero-in" style={{ ["--d" as string]: "0ms" }}>
        {eyebrow}
      </p>
      <h1 className="display-l mt-6 max-w-5xl overflow-hidden pb-2">
        <span className="hero-mask" style={{ ["--d" as string]: "80ms" }}>
          {title} {accent && <em className="accent-italic">{accent}</em>}
        </span>
      </h1>
      {children && (
        <div className="lead hero-in mt-7 max-w-2xl" style={{ ["--d" as string]: "220ms" }}>
          {children}
        </div>
      )}
    </header>
  );
}
