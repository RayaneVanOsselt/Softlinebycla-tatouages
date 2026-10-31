"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCategoryAction, reorderProjectsAction, saveCategoryAction, toggleProjectAction } from "@/app/admin/actions";
import { AdminButton, Feedback, inputCls, labelCls, useAction } from "./ui";

export interface ProjectListItem {
  id: string;
  title: string;
  category: string | null;
  featured: boolean;
  published: boolean;
  cover: string | null;
  mediaCount: number;
}

export interface CategoryItem {
  id: string;
  slug: string;
  name: { fr?: string; nl?: string; en?: string };
  count: number;
}

export function ProjectList({ initial, categories }: { initial: ProjectListItem[]; categories: CategoryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const order = useAction();
  const toggles = useAction();
  const cat = useAction();
  const [newCat, setNewCat] = useState({ fr: "", nl: "", en: "" });

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setItems(next);
    setDirty(true);
  };

  const toggle = (id: string, field: "featured" | "published") => {
    const item = items.find((p) => p.id === id)!;
    const value = !item[field];
    setItems((list) => list.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    toggles.run(() => toggleProjectAction(id, field, value));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <section className="rounded-2xl border border-line-soft bg-white/70 p-3 md:p-4">
        {dirty && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-cream/60 p-3 text-sm">
            Ordre modifié.
            <AdminButton pending={order.pending} onClick={() => order.run(() => reorderProjectsAction(items.map((p) => p.id)), () => setDirty(false))}>
              Enregistrer l’ordre
            </AdminButton>
          </div>
        )}
        <Feedback result={order.result} />
        <Feedback result={toggles.result && !toggles.result.ok ? toggles.result : null} />
        <ul className="divide-y divide-line-soft">
          {items.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg hover:bg-cream disabled:opacity-25" aria-label={`Monter ${p.title}`}>
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="grid size-8 place-items-center rounded-lg hover:bg-cream disabled:opacity-25" aria-label={`Descendre ${p.title}`}>
                  ↓
                </button>
              </div>
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.cover && <img src={p.cover} alt="" className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/portfolio/${p.id}`} className="block truncate font-semibold underline-offset-4 hover:underline">
                  {p.title}
                </Link>
                <p className="text-xs text-fg-muted">
                  {p.category ?? "Sans catégorie"} · {p.mediaCount} média(s)
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs sm:flex-row sm:gap-3">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" checked={p.published} onChange={() => toggle(p.id, "published")} className="size-4 accent-[var(--color-nut)]" /> Publié
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" checked={p.featured} onChange={() => toggle(p.id, "featured")} className="size-4 accent-[var(--color-nut)]" /> À la une
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="h-fit rounded-2xl border border-line-soft bg-white/70 p-4 md:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Catégories</h2>
        <p className="mt-1 text-xs text-fg-muted">Seules les catégories contenant des projets publiés apparaissent dans les filtres du site.</p>
        <ul className="mt-4 space-y-3">
          {categories.map((c) => (
            <CategoryRow key={c.id} c={c} onDone={() => router.refresh()} />
          ))}
        </ul>
        <div className="mt-6 space-y-2 border-t border-line-soft pt-4">
          <p className={labelCls}>Nouvelle catégorie</p>
          {(["fr", "nl", "en"] as const).map((l) => (
            <input key={l} aria-label={`Nom ${l.toUpperCase()}`} placeholder={`Nom ${l.toUpperCase()}`} value={newCat[l]} onChange={(e) => setNewCat({ ...newCat, [l]: e.target.value })} className={inputCls} />
          ))}
          <AdminButton
            pending={cat.pending}
            onClick={() =>
              cat.run(
                () => saveCategoryAction(null, { name: newCat }),
                () => {
                  setNewCat({ fr: "", nl: "", en: "" });
                  router.refresh();
                },
              )
            }
          >
            Ajouter
          </AdminButton>
          <Feedback result={cat.result} />
        </div>
      </section>
    </div>
  );
}

function CategoryRow({ c, onDone }: { c: CategoryItem; onDone: () => void }) {
  const [name, setName] = useState({ fr: c.name.fr ?? "", nl: c.name.nl ?? "", en: c.name.en ?? "" });
  const [open, setOpen] = useState(false);
  const a = useAction();
  return (
    <li className="rounded-xl bg-cream/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">
          {c.name.fr} <span className="text-xs font-normal text-fg-muted">({c.count})</span>
        </span>
        <AdminButton variant="subtle" className="text-xs" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Fermer" : "Modifier"}
        </AdminButton>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          {(["fr", "nl", "en"] as const).map((l) => (
            <input key={l} aria-label={`Nom ${l.toUpperCase()}`} value={name[l]} onChange={(e) => setName({ ...name, [l]: e.target.value })} className={inputCls} />
          ))}
          <div className="flex gap-2">
            <AdminButton pending={a.pending} onClick={() => a.run(() => saveCategoryAction(c.id, { name }), onDone)}>
              Enregistrer
            </AdminButton>
            <AdminButton
              variant="danger"
              pending={a.pending}
              onClick={() => {
                if (confirm(`Supprimer la catégorie « ${c.name.fr} » ?`)) a.run(() => deleteCategoryAction(c.id), onDone);
              }}
            >
              Supprimer
            </AdminButton>
          </div>
          <Feedback result={a.result} />
        </div>
      )}
    </li>
  );
}
