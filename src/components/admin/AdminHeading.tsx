import type { ReactNode } from "react";

export function AdminHeading({ title, text, actions }: { title: string; text?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.2rem,4vw,3.2rem)] leading-none font-light">{title}</h1>
        {text && <p className="mt-3 max-w-2xl text-sm text-fg-muted">{text}</p>}
      </div>
      {actions}
    </div>
  );
}
