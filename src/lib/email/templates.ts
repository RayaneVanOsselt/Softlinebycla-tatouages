/**
 * Modèles d'e-mails aux couleurs de SOFTLINEBY.CLA (FR / NL / EN).
 * HTML en tableaux + styles en ligne (compatibilité Gmail, Outlook, Apple Mail), version texte incluse.
 * Tout contenu saisi par un utilisateur est échappé.
 */
import { brand, siteUrl } from "../config";
import type { Locale } from "../db/schema";
import { localizedPath } from "@/i18n/paths";
import { formatDateLong, formatDuration, formatTime } from "../time";
import type { OutgoingEmail } from "./transport";

const C = brand.colors;

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const nl2br = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

export interface BookingEmailData {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  locale: Locale;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  projectDescription: string;
  placement?: string | null;
  approximateSize?: string | null;
  style?: string | null;
  comment?: string | null;
}

type Row = [label: string, value: string];

interface LayoutInput {
  locale: Locale;
  preheader: string;
  eyebrow: string;
  title: string;
  paragraphs: string[]; // HTML déjà échappé
  rows?: Row[];
  button?: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  note?: string; // HTML déjà échappé
  footer: string;
}

function layout(i: LayoutInput) {
  const rows = i.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;border-top:1px solid ${C.sand};">
        ${i.rows
          .map(
            ([k, v]) => `<tr>
              <td style="padding:12px 0;border-bottom:1px solid ${C.sand};font:500 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${C.lightBrown};width:38%;vertical-align:top;">${esc(k)}</td>
              <td style="padding:12px 0;border-bottom:1px solid ${C.sand};font:400 15px/1.5 Helvetica,Arial,sans-serif;color:${C.darkChocolate};vertical-align:top;">${v}</td>
            </tr>`,
          )
          .join("")}
      </table>`
    : "";
  const btn = (b: { label: string; href: string }, primary: boolean) =>
    `<a href="${esc(b.href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:15px 28px;border-radius:999px;font:500 13px/1 Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;${
      primary ? `background:${C.nutBrown};color:${C.ivory};border:1px solid ${C.nutBrown};` : `background:transparent;color:${C.nutBrown};border:1px solid ${C.nutBrown};`
    }">${esc(b.label)}</a>`;
  const buttons = i.button || i.secondaryButton
    ? `<div style="margin:28px 0 8px;">${i.button ? btn(i.button, true) : ""}${i.secondaryButton ? btn(i.secondaryButton, false) : ""}</div>`
    : "";
  return `<!doctype html>
<html lang="${i.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(i.title)}</title></head>
<body style="margin:0;padding:0;background:${C.ivory};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(i.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ivory};">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
      <tr><td align="center" style="padding:0 0 28px;">
        <img src="${siteUrl()}/brand/logo-ink.png" width="132" alt="${brand.name}" style="display:block;width:132px;height:auto;border:0;">
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${C.cream};border-radius:20px;padding:40px 36px;">
        <p style="margin:0 0 14px;font:500 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:${C.lightBrown};">${esc(i.eyebrow)}</p>
        <h1 style="margin:0 0 22px;font:italic 400 30px/1.2 Georgia,'Times New Roman',serif;color:${C.darkChocolate};">${esc(i.title)}</h1>
        ${i.paragraphs.map((p) => `<p style="margin:0 0 14px;font:400 15px/1.65 Helvetica,Arial,sans-serif;color:${C.darkChocolate};">${p}</p>`).join("")}
        ${rows}
        ${buttons}
        ${i.note ? `<p style="margin:24px 0 0;padding:16px 18px;background:${C.ivory};border-left:2px solid ${C.lightBrown};font:400 13px/1.6 Helvetica,Arial,sans-serif;color:${C.nutBrown};">${i.note}</p>` : ""}
      </td></tr>
      <tr><td align="center" style="padding:24px 12px 0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:${C.lightBrown};">
        ${i.footer}<br><a href="${siteUrl()}/${i.locale}" style="color:${C.lightBrown};">${brand.shortName}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function toText(i: LayoutInput) {
  const strip = (h: string) => h.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [
    brand.name,
    "",
    i.title,
    "",
    ...i.paragraphs.map(strip),
    "",
    ...(i.rows ?? []).map(([k, v]) => `${k} : ${strip(v)}`),
    "",
    i.button ? `${i.button.label} : ${i.button.href}` : "",
    i.secondaryButton ? `${i.secondaryButton.label} : ${i.secondaryButton.href}` : "",
    i.note ? strip(i.note) : "",
    "",
    strip(i.footer),
  ]
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n");
}

function render(i: LayoutInput, subject: string, to: string, extra?: Partial<OutgoingEmail>): OutgoingEmail {
  return { to, subject, html: layout(i), text: toText(i), ...extra };
}

/* ─────────────────────────── Textes localisés ─────────────────────────── */

const T = {
  fr: {
    hello: (n: string) => `Bonjour ${esc(n)},`,
    labels: { date: "Date", time: "Horaire", duration: "Durée", reference: "Référence", project: "Projet", placement: "Zone", size: "Taille" },
    footer: "Cet e-mail vous est envoyé suite à votre demande sur notre site.",
    received: {
      subject: "Demande reçue — en attente de confirmation",
      eyebrow: "Demande de rendez-vous",
      title: "Votre demande est bien arrivée",
      lead: "Nous avons bien reçu votre demande de rendez-vous. Votre créneau est en attente de confirmation par SOFTLINEBY.CLA.",
      notConfirmed: (h: number) =>
        `<strong>Ce n'est pas encore un rendez-vous confirmé.</strong> Le créneau est mis de côté pour vous pendant ${h} h au maximum ; vous recevrez un nouvel e-mail dès que l'artiste aura étudié votre projet.`,
    },
    confirmed: {
      subject: "Votre rendez-vous est confirmé",
      eyebrow: "Rendez-vous confirmé",
      title: "C'est confirmé",
      lead: "Votre rendez-vous avec SOFTLINEBY.CLA est confirmé. Vous trouverez le récapitulatif ci-dessous et un fichier à ajouter à votre agenda.",
      note: "Un empêchement ? Répondez simplement à cet e-mail le plus tôt possible.",
    },
    declined: {
      subject: "Votre demande de rendez-vous",
      eyebrow: "Demande de rendez-vous",
      title: "Ce créneau n'a pas pu être retenu",
      lead: "Merci pour votre demande. Malheureusement, SOFTLINEBY.CLA ne peut pas donner suite à votre demande pour ce créneau.",
      cta: "Choisir un autre moment",
    },
    proposal: {
      subject: "Proposition d'un nouveau créneau",
      eyebrow: "Nouveau créneau proposé",
      title: "Un autre moment vous conviendrait-il ?",
      lead: "SOFTLINEBY.CLA vous propose un nouveau créneau pour votre projet. Il ne sera confirmé qu'après votre accord.",
      accept: "Accepter ce créneau",
      decline: "Refuser",
      expires: (h: number) => `Sans réponse de votre part sous ${h} h, la proposition expirera et le créneau sera libéré.`,
    },
    cancelled: {
      subject: "Votre rendez-vous a été annulé",
      eyebrow: "Annulation",
      title: "Rendez-vous annulé",
      lead: "Votre rendez-vous avec SOFTLINEBY.CLA a été annulé.",
      byClient: "Vous avez refusé le créneau proposé : votre demande est clôturée. N'hésitez pas à en faire une nouvelle quand vous le souhaitez.",
      cta: "Faire une nouvelle demande",
    },
    expired: {
      subject: "Votre demande a expiré",
      eyebrow: "Demande de rendez-vous",
      title: "Votre demande a expiré",
      lead: "Votre demande n'a pas pu être confirmée dans le délai prévu : elle a été clôturée et le créneau a été libéré. Nous en sommes désolés.",
      cta: "Faire une nouvelle demande",
    },
    contactAck: {
      subject: "Nous avons bien reçu votre message",
      eyebrow: "Contact",
      title: "Merci pour votre message",
      lead: "Votre message a bien été transmis à SOFTLINEBY.CLA. Une réponse vous sera apportée dès que possible.",
      subjectLabel: "Sujet",
    },
    messageFromArtist: "Message de l'artiste",
  },
  nl: {
    hello: (n: string) => `Hallo ${esc(n)},`,
    labels: { date: "Datum", time: "Tijdstip", duration: "Duur", reference: "Referentie", project: "Project", placement: "Plaats", size: "Grootte" },
    footer: "Je ontvangt deze e-mail naar aanleiding van je aanvraag op onze website.",
    received: {
      subject: "Aanvraag ontvangen — wacht op bevestiging",
      eyebrow: "Afspraakaanvraag",
      title: "Je aanvraag is goed aangekomen",
      lead: "We hebben je afspraakaanvraag goed ontvangen. Je tijdslot wacht op bevestiging door SOFTLINEBY.CLA.",
      notConfirmed: (h: number) =>
        `<strong>Dit is nog geen bevestigde afspraak.</strong> Het tijdslot wordt maximaal ${h} uur voor je vastgehouden; je krijgt een nieuwe e-mail zodra de artiest je project heeft bekeken.`,
    },
    confirmed: {
      subject: "Je afspraak is bevestigd",
      eyebrow: "Afspraak bevestigd",
      title: "Het is bevestigd",
      lead: "Je afspraak bij SOFTLINEBY.CLA is bevestigd. Hieronder vind je het overzicht en een bestand om aan je agenda toe te voegen.",
      note: "Verhinderd? Beantwoord deze e-mail dan zo snel mogelijk.",
    },
    declined: {
      subject: "Je afspraakaanvraag",
      eyebrow: "Afspraakaanvraag",
      title: "Dit tijdslot kon niet worden vastgelegd",
      lead: "Bedankt voor je aanvraag. Helaas kan SOFTLINEBY.CLA niet ingaan op je aanvraag voor dit tijdslot.",
      cta: "Een ander moment kiezen",
    },
    proposal: {
      subject: "Voorstel voor een nieuw tijdslot",
      eyebrow: "Nieuw tijdslot voorgesteld",
      title: "Past een ander moment je?",
      lead: "SOFTLINEBY.CLA stelt een nieuw tijdslot voor je project voor. Het wordt pas bevestigd na jouw akkoord.",
      accept: "Dit tijdslot aanvaarden",
      decline: "Weigeren",
      expires: (h: number) => `Zonder antwoord binnen ${h} uur vervalt het voorstel en komt het tijdslot weer vrij.`,
    },
    cancelled: {
      subject: "Je afspraak werd geannuleerd",
      eyebrow: "Annulering",
      title: "Afspraak geannuleerd",
      lead: "Je afspraak bij SOFTLINEBY.CLA werd geannuleerd.",
      byClient: "Je hebt het voorgestelde tijdslot geweigerd: je aanvraag is afgesloten. Je kunt altijd een nieuwe aanvraag doen.",
      cta: "Nieuwe aanvraag doen",
    },
    expired: {
      subject: "Je aanvraag is verlopen",
      eyebrow: "Afspraakaanvraag",
      title: "Je aanvraag is verlopen",
      lead: "Je aanvraag kon niet binnen de voorziene termijn worden bevestigd: ze werd afgesloten en het tijdslot kwam weer vrij. Excuses daarvoor.",
      cta: "Nieuwe aanvraag doen",
    },
    contactAck: {
      subject: "We hebben je bericht ontvangen",
      eyebrow: "Contact",
      title: "Bedankt voor je bericht",
      lead: "Je bericht werd doorgestuurd naar SOFTLINEBY.CLA. Je krijgt zo snel mogelijk een antwoord.",
      subjectLabel: "Onderwerp",
    },
    messageFromArtist: "Bericht van de artiest",
  },
  en: {
    hello: (n: string) => `Hello ${esc(n)},`,
    labels: { date: "Date", time: "Time", duration: "Duration", reference: "Reference", project: "Project", placement: "Placement", size: "Size" },
    footer: "You are receiving this email following your request on our website.",
    received: {
      subject: "Request received — awaiting confirmation",
      eyebrow: "Appointment request",
      title: "Your request has arrived",
      lead: "We have received your appointment request. Your time slot is awaiting confirmation by SOFTLINEBY.CLA.",
      notConfirmed: (h: number) =>
        `<strong>This is not a confirmed appointment yet.</strong> The slot is held for you for up to ${h} hours; you will receive another email as soon as the artist has reviewed your project.`,
    },
    confirmed: {
      subject: "Your appointment is confirmed",
      eyebrow: "Appointment confirmed",
      title: "You're booked in",
      lead: "Your appointment with SOFTLINEBY.CLA is confirmed. Please find the summary below and a file to add it to your calendar.",
      note: "Can't make it? Simply reply to this email as early as possible.",
    },
    declined: {
      subject: "Your appointment request",
      eyebrow: "Appointment request",
      title: "This slot could not be accepted",
      lead: "Thank you for your request. Unfortunately, SOFTLINEBY.CLA is unable to accept your request for this time slot.",
      cta: "Choose another time",
    },
    proposal: {
      subject: "A new time slot has been proposed",
      eyebrow: "New time proposed",
      title: "Would another time suit you?",
      lead: "SOFTLINEBY.CLA is proposing a new time slot for your project. It will only be confirmed once you accept it.",
      accept: "Accept this slot",
      decline: "Decline",
      expires: (h: number) => `If we don't hear from you within ${h} hours, the proposal will expire and the slot will be released.`,
    },
    cancelled: {
      subject: "Your appointment has been cancelled",
      eyebrow: "Cancellation",
      title: "Appointment cancelled",
      lead: "Your appointment with SOFTLINEBY.CLA has been cancelled.",
      byClient: "You declined the proposed time slot, so your request is now closed. You are welcome to make a new one at any time.",
      cta: "Make a new request",
    },
    expired: {
      subject: "Your request has expired",
      eyebrow: "Appointment request",
      title: "Your request has expired",
      lead: "Your request could not be confirmed within the expected time, so it has been closed and the slot released. We apologise for this.",
      cta: "Make a new request",
    },
    contactAck: {
      subject: "We have received your message",
      eyebrow: "Contact",
      title: "Thank you for your message",
      lead: "Your message has been passed on to SOFTLINEBY.CLA. You will receive a reply as soon as possible.",
      subjectLabel: "Subject",
    },
    messageFromArtist: "Message from the artist",
  },
} as const;

function bookingRows(d: BookingEmailData, locale: Locale, withProject = false): Row[] {
  const L = T[locale].labels;
  const rows: Row[] = [
    [L.date, esc(formatDateLong(d.startAt, locale))],
    [L.time, `${formatTime(d.startAt, locale)} – ${formatTime(d.endAt, locale)}`],
    [L.duration, formatDuration(d.durationMinutes, locale)],
    [L.reference, esc(d.reference)],
  ];
  if (withProject) rows.push([L.project, nl2br(d.projectDescription)]);
  return rows;
}

function artistMessage(locale: Locale, message?: string | null) {
  return message?.trim() ? `<em>${esc(T[locale].messageFromArtist)} :</em><br>${nl2br(message.trim())}` : undefined;
}

const bookingUrl = (locale: Locale) => `${siteUrl()}${localizedPath("/booking", locale)}`;

export const emails = {
  requestReceived(d: BookingEmailData, holdHours: number) {
    const t = T[d.locale];
    return render(
      {
        locale: d.locale,
        preheader: t.received.lead,
        eyebrow: t.received.eyebrow,
        title: t.received.title,
        paragraphs: [t.hello(d.firstName), esc(t.received.lead)],
        rows: bookingRows(d, d.locale, true),
        note: t.received.notConfirmed(holdHours),
        footer: esc(t.footer),
      },
      `${t.received.subject} · ${d.reference}`,
      d.email,
    );
  },

  confirmed(d: BookingEmailData, ics: string, message?: string | null) {
    const t = T[d.locale];
    return render(
      {
        locale: d.locale,
        preheader: t.confirmed.lead,
        eyebrow: t.confirmed.eyebrow,
        title: t.confirmed.title,
        paragraphs: [t.hello(d.firstName), esc(t.confirmed.lead), ...(artistMessage(d.locale, message) ? [artistMessage(d.locale, message)!] : [])],
        rows: bookingRows(d, d.locale),
        note: esc(t.confirmed.note),
        footer: esc(t.footer),
      },
      `${t.confirmed.subject} · ${d.reference}`,
      d.email,
      { attachments: [{ filename: `${d.reference}.ics`, content: ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }] },
    );
  },

  declined(d: BookingEmailData, message?: string | null) {
    const t = T[d.locale];
    return render(
      {
        locale: d.locale,
        preheader: t.declined.lead,
        eyebrow: t.declined.eyebrow,
        title: t.declined.title,
        paragraphs: [t.hello(d.firstName), esc(t.declined.lead), ...(artistMessage(d.locale, message) ? [artistMessage(d.locale, message)!] : [])],
        rows: bookingRows(d, d.locale),
        button: { label: t.declined.cta, href: bookingUrl(d.locale) },
        footer: esc(t.footer),
      },
      `${t.declined.subject} · ${d.reference}`,
      d.email,
    );
  },

  proposal(d: BookingEmailData, responseUrl: string, holdHours: number, message?: string | null) {
    const t = T[d.locale];
    return render(
      {
        locale: d.locale,
        preheader: t.proposal.lead,
        eyebrow: t.proposal.eyebrow,
        title: t.proposal.title,
        paragraphs: [t.hello(d.firstName), esc(t.proposal.lead), ...(artistMessage(d.locale, message) ? [artistMessage(d.locale, message)!] : [])],
        rows: bookingRows(d, d.locale),
        button: { label: t.proposal.accept, href: `${responseUrl}&choice=accept` },
        secondaryButton: { label: t.proposal.decline, href: `${responseUrl}&choice=decline` },
        note: esc(t.proposal.expires(holdHours)),
        footer: esc(t.footer),
      },
      `${t.proposal.subject} · ${d.reference}`,
      d.email,
    );
  },

  cancelled(d: BookingEmailData, opts: { byClient?: boolean; message?: string | null }) {
    const t = T[d.locale];
    const lead = opts.byClient ? t.cancelled.byClient : t.cancelled.lead;
    return render(
      {
        locale: d.locale,
        preheader: lead,
        eyebrow: t.cancelled.eyebrow,
        title: t.cancelled.title,
        paragraphs: [t.hello(d.firstName), esc(lead), ...(artistMessage(d.locale, opts.message) ? [artistMessage(d.locale, opts.message)!] : [])],
        rows: bookingRows(d, d.locale),
        button: { label: t.cancelled.cta, href: bookingUrl(d.locale) },
        footer: esc(t.footer),
      },
      `${t.cancelled.subject} · ${d.reference}`,
      d.email,
    );
  },

  expired(d: BookingEmailData) {
    const t = T[d.locale];
    return render(
      {
        locale: d.locale,
        preheader: t.expired.lead,
        eyebrow: t.expired.eyebrow,
        title: t.expired.title,
        paragraphs: [t.hello(d.firstName), esc(t.expired.lead)],
        rows: bookingRows(d, d.locale),
        button: { label: t.expired.cta, href: bookingUrl(d.locale) },
        footer: esc(t.footer),
      },
      `${t.expired.subject} · ${d.reference}`,
      d.email,
    );
  },

  contactAck(input: { locale: Locale; firstName: string; email: string; subject: string; message: string }) {
    const t = T[input.locale];
    return render(
      {
        locale: input.locale,
        preheader: t.contactAck.lead,
        eyebrow: t.contactAck.eyebrow,
        title: t.contactAck.title,
        paragraphs: [t.hello(input.firstName), esc(t.contactAck.lead)],
        rows: [[t.contactAck.subjectLabel, esc(input.subject)], ["Message", nl2br(input.message)]],
        footer: esc(t.footer),
      },
      t.contactAck.subject,
      input.email,
    );
  },

  /* ─────────── E-mails administrateur (en français) ─────────── */

  adminNewRequest(d: BookingEmailData & { attachments: number; calendarChecked: boolean }, adminUrl: string, to: string) {
    const rows: Row[] = [
      ["Client", `${esc(d.firstName)} ${esc(d.lastName)}`],
      ["E-mail", `<a href="mailto:${esc(d.email)}" style="color:${C.nutBrown};">${esc(d.email)}</a>`],
      ["Langue", d.locale.toUpperCase()],
      ...bookingRows(d, "fr"),
      ["Projet", nl2br(d.projectDescription)],
    ];
    if (d.placement) rows.push(["Zone du corps", esc(d.placement)]);
    if (d.approximateSize) rows.push(["Taille", esc(d.approximateSize)]);
    if (d.style) rows.push(["Style", esc(d.style)]);
    if (d.comment) rows.push(["Commentaire", nl2br(d.comment)]);
    rows.push(["Références", d.attachments ? `${d.attachments} image(s) — visibles dans l'administration` : "Aucune"]);
    return render(
      {
        locale: "fr",
        preheader: `Nouvelle demande de ${d.firstName} ${d.lastName}`,
        eyebrow: "Nouvelle demande",
        title: `${d.firstName} ${d.lastName}`,
        paragraphs: ["Une nouvelle demande de rendez-vous attend votre décision. Le créneau est bloqué provisoirement."],
        rows,
        button: { label: "Ouvrir la demande", href: adminUrl },
        note: d.calendarChecked ? undefined : "⚠︎ Google Agenda n'a pas pu être consulté au moment de la demande : vérifiez votre agenda avant d'accepter.",
        footer: "Notification automatique de votre site.",
      },
      `Nouvelle demande · ${d.firstName} ${d.lastName} · ${formatDateLong(d.startAt, "fr")} ${formatTime(d.startAt, "fr")}`,
      to,
      { replyTo: d.email },
    );
  },

  adminProposalAnswer(d: BookingEmailData, accepted: boolean, adminUrl: string, to: string) {
    return render(
      {
        locale: "fr",
        preheader: accepted ? "Créneau accepté par le client" : "Créneau refusé par le client",
        eyebrow: accepted ? "Proposition acceptée" : "Proposition refusée",
        title: `${d.firstName} ${d.lastName}`,
        paragraphs: [
          accepted
            ? "Le client a accepté le nouveau créneau : le rendez-vous est maintenant confirmé et un e-mail de confirmation lui a été envoyé."
            : "Le client a refusé le nouveau créneau : la demande est clôturée et le créneau libéré.",
        ],
        rows: bookingRows(d, "fr"),
        button: { label: "Voir la réservation", href: adminUrl },
        footer: "Notification automatique de votre site.",
      },
      `${accepted ? "✓ Créneau accepté" : "✕ Créneau refusé"} · ${d.firstName} ${d.lastName}`,
      to,
      { replyTo: d.email },
    );
  },

  adminContact(input: { firstName: string; lastName: string; email: string; subject: string; message: string; locale: Locale }, adminUrl: string, to: string) {
    return render(
      {
        locale: "fr",
        preheader: input.subject,
        eyebrow: "Nouveau message",
        title: input.subject,
        paragraphs: [`De <strong>${esc(input.firstName)} ${esc(input.lastName)}</strong> (${esc(input.email)}) — langue ${input.locale.toUpperCase()}`, nl2br(input.message)],
        button: { label: "Voir dans l'administration", href: adminUrl },
        note: "Répondez directement à cet e-mail : la réponse partira vers l'adresse du client.",
        footer: "Notification automatique de votre site.",
      },
      `Message · ${input.subject}`,
      to,
      { replyTo: input.email },
    );
  },

  adminLogin(link: string, to: string) {
    return render(
      {
        locale: "fr",
        preheader: "Votre lien de connexion à l'administration",
        eyebrow: "Administration",
        title: "Lien de connexion",
        paragraphs: ["Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 15 minutes et ne fonctionne qu'une seule fois."],
        button: { label: "Me connecter", href: link },
        note: "Vous n'avez rien demandé ? Ignorez cet e-mail : personne ne pourra se connecter sans ce lien.",
        footer: "E-mail de sécurité automatique.",
      },
      "Connexion à l'administration SOFTLINEBY.CLA",
      to,
    );
  },
};
