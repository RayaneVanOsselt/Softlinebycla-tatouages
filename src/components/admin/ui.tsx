"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/admin/actions";

export function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      try {
        const r = await fn();
        setResult(r);
        if (r.ok) onOk?.();
      } catch (e) {
        setResult({ ok: false, error: e instanceof Error ? e.message : "Erreur" });
      }
    });
  return { pending, result, run, setResult };
}

export function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  if (result.ok && !result.message) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm ${result.ok ? "bg-cream/60 text-chocolate" : "border border-nut bg-ivory font-semibold text-nut"}`}>
      {result.ok ? `✓ ${result.message}` : `⚠︎ ${result.error}`}
    </p>
  );
}

export function AdminButton({
  children,
  variant = "primary",
  pending,
  className = "",
  ...props
}: { children: ReactNode; variant?: "primary" | "ghost" | "danger" | "subtle"; pending?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-nut text-ivory hover:bg-chocolate",
    ghost: "border border-line hover:border-chocolate",
    danger: "border border-nut text-nut hover:bg-nut hover:text-ivory",
    subtle: "text-nut underline underline-offset-4 hover:text-chocolate",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      disabled={pending || props.disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${variant === "subtle" ? "min-h-0 px-0" : ""} ${styles} ${className}`}
    >
      {pending && <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line-soft bg-white/70 p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="font-[family-name:var(--font-display)] text-2xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export const inputCls = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[0.95rem] focus:border-chocolate focus:outline-none focus-visible:ring-2 focus-visible:ring-nut/30";
export const labelCls = "block text-[0.72rem] font-bold uppercase tracking-[0.12em] text-fg-muted mb-1.5";
