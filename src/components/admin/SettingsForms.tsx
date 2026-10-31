"use client";

import { useState } from "react";
import { eraseClientDataAction, saveSettingAction } from "@/app/admin/actions";
import type { BookingSettings, ContactSettings, ContentSettings, LegalSettings, SocialSettings } from "@/lib/settings";
import { AdminButton, Feedback, inputCls, labelCls, Panel, useAction } from "./ui";

type Loc = "fr" | "nl" | "en";
const LANGS: Loc[] = ["fr", "nl", "en"];

function Field({ id, label, children, help }: { id: string; label: string; children: React.ReactNode; help?: string }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
      {help && <p className="mt-1 text-xs text-fg-muted">{help}</p>}
    </div>
  );
}

export function ContactForm({ initial }: { initial: ContactSettings }) {
  const [v, setV] = useState(initial);
  const a = useAction();
  return (
    <Panel title="Contact & notifications">
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="ce" label="E-mail de contact (affiché sur le site)" help="Reçoit aussi les messages du formulaire de contact.">
          <input id="ce" type="email" value={v.contactEmail} onChange={(e) => setV({ ...v, contactEmail: e.target.value })} className={inputCls} />
        </Field>
        <Field id="be" label="E-mail qui reçoit les demandes de rendez-vous" help="Laissez vide pour utiliser l'e-mail de contact.">
          <input id="be" type="email" value={v.bookingNotificationEmail} onChange={(e) => setV({ ...v, bookingNotificationEmail: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.contactAutoReply} onChange={(e) => setV({ ...v, contactAutoReply: e.target.checked })} className="size-4 accent-[var(--color-nut)]" />
        Envoyer un accusé de réception aux personnes qui écrivent via le formulaire de contact
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton pending={a.pending} onClick={() => a.run(() => saveSettingAction("contact", v))}>
          Enregistrer
        </AdminButton>
        <Feedback result={a.result} />
      </div>
    </Panel>
  );
}

export function SocialForm({ initial }: { initial: SocialSettings }) {
  const [v, setV] = useState(initial);
  const a = useAction();
  const fields: Array<[keyof SocialSettings, string, string]> = [
    ["instagram", "Instagram", "https://www.instagram.com/…"],
    ["tiktok", "TikTok", "https://www.tiktok.com/@…"],
    ["pinterest", "Pinterest", "https://www.pinterest.com/…"],
    ["facebook", "Facebook", "https://www.facebook.com/…"],
    ["youtube", "YouTube", "https://www.youtube.com/@…"],
  ];
  return (
    <Panel title="Réseaux sociaux">
      <p className="mb-4 text-xs text-fg-muted">Une icône n’apparaît sur le site que si son adresse est renseignée (https uniquement). Laissez vide pour masquer.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(([k, label, ph]) => (
          <Field key={k} id={`s-${k}`} label={label}>
            <input id={`s-${k}`} type="url" placeholder={ph} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value.trim() })} className={inputCls} />
          </Field>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton pending={a.pending} onClick={() => a.run(() => saveSettingAction("social", v))}>
          Enregistrer
        </AdminButton>
        <Feedback result={a.result} />
      </div>
    </Panel>
  );
}

export function BookingForm({ initial }: { initial: BookingSettings }) {
  const [v, setV] = useState(initial);
  const a = useAction();
  const num = (k: keyof BookingSettings, label: string, help: string, min: number, max: number) => (
    <Field id={`b-${k}`} label={label} help={help}>
      <input id={`b-${k}`} type="number" min={min} max={max} value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} className={inputCls} />
    </Field>
  );
  return (
    <Panel title="Réservation">
      <div className="grid gap-4 md:grid-cols-2">
        {num("pendingHoldHours", "Blocage d’une demande en attente (heures)", "Sans décision de votre part dans ce délai, la demande expire et le créneau est libéré.", 6, 336)}
        {num("proposalHoldHours", "Délai de réponse à une proposition (heures)", "Temps laissé au client pour accepter un nouveau créneau.", 6, 336)}
        {num("minNoticeHours", "Délai minimum avant un rendez-vous (heures)", "Ex. 24 = impossible de demander un créneau pour dans moins de 24 h.", 0, 720)}
        {num("maxAdvanceDays", "Réservation possible jusqu’à (jours)", "Fenêtre visible dans le calendrier public.", 7, 365)}
        {num("maxDurationHours", "Durée maximale sélectionnable (heures)", "Entre 1 et 9 h (plage 11:00–20:00).", 1, 9)}
        {num("attachmentRetentionDays", "Conservation des images de référence (jours)", "Après le rendez-vous ou la clôture de la demande.", 7, 730)}
        {num("dataRetentionMonths", "Anonymisation des données clients (mois)", "Après le rendez-vous ou la réception du message.", 3, 120)}
      </div>
      <p className="mt-4 rounded-xl bg-cream/40 p-3 text-xs">
        Toujours actif, non modifiable : aucune confirmation automatique, aucun jour ouvert par défaut, créneaux d’une heure entre 11:00 et 20:00 (Europe/Brussels).
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton pending={a.pending} onClick={() => a.run(() => saveSettingAction("booking", v))}>
          Enregistrer
        </AdminButton>
        <Feedback result={a.result} />
      </div>
    </Panel>
  );
}

const CONTENT_FIELDS: Array<[keyof ContentSettings, string, boolean]> = [
  ["heroTitle", "Accueil — grand titre (remplace « L’art de la ligne / tout en douceur »)", false],
  ["heroText", "Accueil — texte d’introduction", true],
  ["manifesto", "Accueil — manifeste", true],
  ["aboutIntro", "Présentation (accueil + page À propos)", true],
  ["aboutApproach", "À propos — « Mon approche »", true],
  ["aboutBody", "À propos — « L’univers »", true],
  ["ctaTitle", "Appel à l’action — titre", false],
  ["ctaText", "Appel à l’action — texte", true],
];

export function ContentForm({ initial, defaults }: { initial: ContentSettings; defaults: Record<Loc, Record<string, string>> }) {
  const [v, setV] = useState(initial);
  const [lang, setLang] = useState<Loc>("fr");
  const a = useAction();
  return (
    <Panel title="Textes du site">
      <p className="mb-4 text-xs text-fg-muted">Laissez un champ vide pour garder le texte d’origine (affiché en gris). Les traductions sont indépendantes pour chaque langue.</p>
      <div role="tablist" aria-label="Langue" className="mb-4 flex gap-1">
        {LANGS.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lang === l ? "bg-nut text-ivory" : "border border-line"}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {CONTENT_FIELDS.map(([k, label, long]) => {
          const id = `c-${k}-${lang}`;
          const value = v[k][lang] ?? "";
          const set = (val: string) => setV({ ...v, [k]: { ...v[k], [lang]: val } });
          return (
            <Field key={id} id={id} label={label}>
              {long ? (
                <textarea id={id} rows={3} value={value} placeholder={defaults[lang][k]} onChange={(e) => set(e.target.value)} className={inputCls} />
              ) : (
                <input id={id} value={value} placeholder={defaults[lang][k]} onChange={(e) => set(e.target.value)} className={inputCls} />
              )}
            </Field>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton pending={a.pending} onClick={() => a.run(() => saveSettingAction("content", v))}>
          Enregistrer les textes
        </AdminButton>
        <Feedback result={a.result} />
      </div>
    </Panel>
  );
}

export function LegalForm({ initial }: { initial: LegalSettings }) {
  const [v, setV] = useState(initial);
  const [lang, setLang] = useState<Loc>("fr");
  const a = useAction();
  const text = (k: keyof LegalSettings, label: string, help?: string) => (
    <Field id={`l-${k}`} label={label} help={help}>
      <input id={`l-${k}`} value={v[k] as string} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={inputCls} />
    </Field>
  );
  return (
    <Panel title="Mentions légales & confidentialité">
      <p className="mb-4 rounded-xl border border-nut p-3 text-xs">
        Ces informations sont obligatoires pour une activité professionnelle en Belgique. Faites vérifier les textes juridiques avant publication. Seuls les champs remplis sont affichés.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {text("businessName", "Nom / dénomination", "Ex. votre nom ou celui de l'entreprise")}
        {text("legalForm", "Forme juridique", "Ex. personne physique (indépendante), SRL…")}
        {text("enterpriseNumber", "Numéro d’entreprise (BCE)", "Ex. BE 0123.456.789")}
        {text("vatNumber", "Numéro de TVA")}
        {text("privacyEmail", "E-mail pour les questions de données personnelles")}
        {text("reviewedAt", "Date de dernière mise à jour", "Ex. 31 octobre 2026")}
        <div className="md:col-span-2">{text("registeredAddress", "Adresse (affichée seulement si PUBLIC_ADDRESS_ENABLED=true)")}</div>
      </div>
      <div role="tablist" aria-label="Langue" className="mt-6 mb-3 flex gap-1">
        {LANGS.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lang === l ? "bg-nut text-ivory" : "border border-line"}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`lx-${lang}`} label={`Texte complémentaire — mentions légales (${lang.toUpperCase()})`}>
          <textarea id={`lx-${lang}`} rows={4} value={v.extraLegalText[lang] ?? ""} onChange={(e) => setV({ ...v, extraLegalText: { ...v.extraLegalText, [lang]: e.target.value } })} className={inputCls} />
        </Field>
        <Field id={`px-${lang}`} label={`Texte complémentaire — confidentialité (${lang.toUpperCase()})`}>
          <textarea id={`px-${lang}`} rows={4} value={v.extraPrivacyText[lang] ?? ""} onChange={(e) => setV({ ...v, extraPrivacyText: { ...v.extraPrivacyText, [lang]: e.target.value } })} className={inputCls} />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton pending={a.pending} onClick={() => a.run(() => saveSettingAction("legal", v))}>
          Enregistrer
        </AdminButton>
        <Feedback result={a.result} />
      </div>
    </Panel>
  );
}

export function PrivacyTools() {
  const [email, setEmail] = useState("");
  const a = useAction();
  return (
    <Panel title="Données personnelles (RGPD)">
      <p className="mb-4 text-xs text-fg-muted">Répondre à une demande d’accès ou d’effacement : saisissez l’adresse e-mail de la personne.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input type="email" aria-label="E-mail du client" placeholder="client@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <a
          href={email ? `/api/admin/export?email=${encodeURIComponent(email)}` : undefined}
          aria-disabled={!email}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold ${email ? "hover:border-chocolate" : "pointer-events-none opacity-50"}`}
        >
          Exporter (JSON)
        </a>
        <AdminButton
          variant="danger"
          className="shrink-0"
          pending={a.pending}
          disabled={!email}
          onClick={() => {
            if (confirm(`Effacer définitivement les données de ${email} ?`)) a.run(() => eraseClientDataAction(email));
          }}
        >
          Effacer
        </AdminButton>
      </div>
      <div className="mt-3">
        <Feedback result={a.result} />
      </div>
    </Panel>
  );
}
