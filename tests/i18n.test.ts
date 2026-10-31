import { describe, expect, it } from "vitest";
import fr from "../messages/fr.json";
import nl from "../messages/nl.json";
import en from "../messages/en.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return obj.flatMap((v, i) => keys(v, `${prefix}[${i}]`));
  if (obj && typeof obj === "object") return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("traductions", () => {
  it("FR, NL et EN ont exactement les mêmes clés (aucun texte manquant)", () => {
    const f = keys(fr).sort();
    expect(keys(nl).sort()).toEqual(f);
    expect(keys(en).sort()).toEqual(f);
  });

  it("aucun texte vide", () => {
    for (const [name, m] of Object.entries({ fr, nl, en })) {
      const empty = keys(m).filter((k) => {
        const v = k.split(/\.|\[|\]/).filter(Boolean).reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], m);
        return typeof v === "string" && v.trim() === "" && !k.endsWith('styleOptions.');
      });
      expect(empty, name).toEqual([]);
    }
  });
});
