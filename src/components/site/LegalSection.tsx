import type { ReactNode } from "react";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-10 md:grid-cols-[16rem_1fr] md:gap-10">
      <h2 className="display-s">{title}</h2>
      <div className="space-y-4 text-fg-muted [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div>
    </section>
  );
}
