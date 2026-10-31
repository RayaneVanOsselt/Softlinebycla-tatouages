/**
 * ════════════════════════════════════════════════════════════════════════
 *  SOFTLINEBY.CLA — moteur de réservation (Google Apps Script, gratuit)
 *
 *  Ce fichier unique se colle dans : Google Sheet → Extensions → Apps Script.
 *  Il fournit :
 *   • l'API utilisée par le site (disponibilités, demandes, contact, réponses aux propositions) ;
 *   • l'administration directement dans le Google Sheet (cases à cocher + liste « Décision ») ;
 *   • les e-mails automatiques FR / NL / EN (depuis votre Gmail) ;
 *   • la synchronisation Google Agenda ;
 *   • le stockage privé des images de référence (Google Drive) ;
 *   • l'expiration automatique, les relances et la purge RGPD (toutes les heures).
 *
 *  Sécurité anti double-réservation : toutes les écritures passent par un verrou (LockService) :
 *  deux demandes simultanées sur le même créneau ne peuvent jamais être acceptées toutes les deux.
 *  Guide : docs/GUIDE-DEMARRAGE.md
 * ════════════════════════════════════════════════════════════════════════
 */

var TZ = "Europe/Brussels";
var DAY_START = 11 * 60; // 11:00
var DAY_END = 20 * 60; // 20:00
var SLOT = 60; // minutes
var BRAND = "SOFTLINEBY.CLA";
var DEFAULT_SITE_URL = "https://rayanevanosselt.github.io/Softlinebycla-tatouages";

var SHEETS = {
  bookings: "Réservations",
  availability: "Disponibilités",
  blocked: "Indisponibilités",
  messages: "Messages",
  settings: "Paramètres",
  journal: "Journal",
};

var STATUS = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Refusé",
  RESCHEDULE_PROPOSED: "Proposition envoyée",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
  COMPLETED: "Terminé",
};
var BLOCKING = ["PENDING", "RESCHEDULE_PROPOSED", "CONFIRMED"];

var DECISIONS = {
  accept: "Accepter",
  decline: "Refuser",
  propose: "Proposer le nouveau créneau",
  cancel: "Annuler le rendez-vous",
  complete: "Marquer terminé",
};

/** Colonnes de l'onglet Réservations (les 15 premières = suivi demandé ; ensuite : outils de décision ; puis colonnes techniques masquées). */
var COLUMNS = [
  ["ref", "ID réservation", 120],
  ["createdAt", "Date de création", 130],
  ["firstName", "Prénom", 110],
  ["lastName", "Nom", 110],
  ["email", "E-mail", 190],
  ["date", "Date demandée", 130],
  ["start", "Début", 60],
  ["end", "Fin", 60],
  ["duration", "Durée", 60],
  ["project", "Projet", 280],
  ["placement", "Emplacement", 130],
  ["size", "Taille", 80],
  ["status", "Statut", 150],
  ["eventId", "Référence Calendar", 140],
  ["notes", "Notes", 200],
  ["decision", "➜ Décision", 200],
  ["finalHours", "Durée finale (h)", 90],
  ["newDate", "Nouvelle date", 110],
  ["newTime", "Nouvelle heure", 90],
  ["clientMessage", "Message au client", 220],
  ["style", "Style", 110],
  ["comment", "Commentaire", 200],
  ["locale", "Langue", 60],
  ["references", "Images de référence", 200],
  ["holdUntil", "Bloqué jusqu'au", 130],
  ["history", "Historique", 320],
  ["startIso", "tech: début", 10, true],
  ["endIso", "tech: fin", 10, true],
  ["estimatedMinutes", "tech: durée estimée", 10, true],
  ["tokenHash", "tech: jeton", 10, true],
  ["requestedIso", "tech: créneau initial", 10, true],
  ["fileIds", "tech: fichiers", 10, true],
  ["statusCode", "tech: statut", 10, true],
  ["holdIso", "tech: blocage", 10, true],
  ["calendarState", "tech: agenda", 10, true],
];
var COL = {};
COLUMNS.forEach(function (c, i) {
  COL[c[0]] = i + 1;
});

var SETTINGS = [
  ["notifyEmail", "E-mail qui reçoit les demandes et messages", ""],
  ["siteUrl", "Adresse du site", DEFAULT_SITE_URL],
  ["allOpen", "Calendrier entièrement ouvert : chaque jour de 11:00 à 20:00, les clients choisissent librement (oui/non ; « non » = seules les heures cochées dans l'onglet Disponibilités)", "oui"],
  ["pendingHoldHours", "Blocage d'une demande en attente (heures)", 72],
  ["proposalHoldHours", "Délai de réponse à une proposition (heures)", 72],
  ["minNoticeHours", "Délai minimum avant un rendez-vous (heures)", 24],
  ["maxAdvanceDays", "Réservation possible jusqu'à (jours)", 120],
  ["maxDurationHours", "Durée maximale sélectionnable (heures)", 6],
  ["attachmentRetentionDays", "Suppression des images de référence après (jours)", 120],
  ["dataRetentionMonths", "Anonymisation des données clients après (mois)", 24],
  ["useMainCalendar", "Mon agenda Google principal bloque aussi des créneaux (oui/non)", "oui"],
  ["contactAutoReply", "Accusé de réception pour les messages de contact (oui/non)", "oui"],
];

/* ═════════════════════════════ Dates (fuseau Europe/Brussels) ═════════════════════════════ */

function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

/** Parties locales (Bruxelles) d'un instant. */
function localParts(d) {
  var s = Utilities.formatDate(d, TZ, "yyyy-MM-dd HH:mm u");
  var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) (\d)$/.exec(s);
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], dateKey: m[1] + "-" + m[2] + "-" + m[3], minute: +m[4] * 60 + +m[5], weekday: +m[6] % 7 };
}

/** Instant correspondant à « date locale + minutes » à Bruxelles (gère l'heure d'été/hiver). */
function zonedToUtc(dateKey, minute) {
  var p = dateKey.split("-").map(Number);
  var guess = Date.UTC(p[0], p[1] - 1, p[2], 0, minute);
  var t = guess;
  for (var i = 0; i < 3; i++) {
    var lp = localParts(new Date(t));
    var asUtc = Date.UTC(lp.y, lp.mo - 1, lp.d, lp.h, lp.mi);
    var diff = asUtc - guess;
    if (diff === 0) break;
    t -= diff;
  }
  return new Date(t);
}

function isDateKey(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  var p = s.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}

function addDays(dateKey, n) {
  var p = dateKey.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
}

function daysInMonth(month) {
  var p = month.split("-").map(Number);
  var n = new Date(Date.UTC(p[0], p[1], 0)).getUTCDate();
  var out = [];
  for (var i = 1; i <= n; i++) out.push(month + "-" + pad(i));
  return out;
}

function hm(minute) {
  return pad(Math.floor(minute / 60)) + ":" + pad(minute % 60);
}

function hmToMinute(s) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  return m ? +m[1] * 60 + +m[2] : NaN;
}

function slotStarts() {
  var out = [];
  for (var m = DAY_START; m + SLOT <= DAY_END; m += SLOT) out.push(m);
  return out;
}

/** Convertit une saisie de date du tableur (objet Date, « 10/11/2026 » ou « 2026-11-10 ») en AAAA-MM-JJ. */
function toDateKey(value) {
  if (value instanceof Date && !isNaN(value)) return localParts(value).dateKey;
  var s = String(value || "").trim();
  if (isDateKey(s)) return s;
  var m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s);
  if (m) {
    var k = m[3] + "-" + pad(+m[2]) + "-" + pad(+m[1]);
    return isDateKey(k) ? k : null;
  }
  return null;
}

/* ═════════════════════════════ Moteur de disponibilités (pur) ═════════════════════════════ */

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Raison pour laquelle une plage n'est pas réservable, ou null.
 * opts: { duration, now (ms), minNoticeMinutes, maxAdvanceDays }
 */
function checkInterval(dateKey, startMinute, openSet, blockers, opts) {
  var duration = opts.duration;
  if (duration <= 0 || duration % SLOT !== 0) return "outside_range";
  if (startMinute < DAY_START || startMinute + duration > DAY_END || (startMinute - DAY_START) % SLOT !== 0) return "outside_range";
  var today = localParts(new Date(opts.now)).dateKey;
  if (dateKey < today || dateKey > addDays(today, opts.maxAdvanceDays)) return "outside_window";
  for (var k = 0; k < duration / SLOT; k++) if (!openSet[startMinute + k * SLOT]) return "not_open";
  var iv = { start: zonedToUtc(dateKey, startMinute).getTime(), end: zonedToUtc(dateKey, startMinute + duration).getTime() };
  if (iv.start < opts.now + opts.minNoticeMinutes * 60000) return "too_soon";
  var held = false;
  for (var i = 0; i < blockers.length; i++) {
    if (!overlaps(iv, blockers[i])) continue;
    if (blockers[i].kind === "busy") return "conflict";
    held = true;
  }
  return held ? "held" : null;
}

function computeDay(dateKey, openSet, blockers, opts) {
  var today = localParts(new Date(opts.now)).dateKey;
  var hasOpen = Object.keys(openSet).length > 0;
  if (!hasOpen || dateKey < today || dateKey > addDays(today, opts.maxAdvanceDays)) return { date: dateKey, state: "closed", slots: [] };
  var slots = [];
  slotStarts().forEach(function (m) {
    var r = checkInterval(dateKey, m, openSet, blockers, opts);
    if (r === "outside_range" || r === "not_open" || r === "too_soon" || r === "outside_window") return;
    slots.push({ startMinute: m, start: hm(m), end: hm(m + opts.duration), status: r === null ? "available" : r === "held" ? "held" : "unavailable" });
  });
  var cut = opts.now + opts.minNoticeMinutes * 60000;
  var anyFuture = Object.keys(openSet).some(function (m) {
    return zonedToUtc(dateKey, +m).getTime() >= cut;
  });
  var state = slots.some(function (s) { return s.status === "available"; }) ? "available" : slots.some(function (s) { return s.status === "held"; }) ? "held" : anyFuture ? "full" : "closed";
  return { date: dateKey, state: state, slots: slots };
}

/**
 * Heures ouvertes par jour ({ "AAAA-MM-JJ": { minute: true } }).
 * Calendrier entièrement ouvert (réglage par défaut) : chaque jour, toute la plage 11:00–20:00 ;
 * les rendez-vous, les indisponibilités et Google Agenda retirent ensuite les créneaux pris.
 * Sinon : uniquement les cases cochées dans l'onglet Disponibilités.
 */
function openHours(store, cfg, fromKey, toKey) {
  if (!cfg.allOpen) return store.openMap(fromKey, toKey);
  var map = {};
  for (var k = fromKey; k <= toKey; k = addDays(k, 1)) {
    var set = {};
    slotStarts().forEach(function (m) {
      set[m] = true;
    });
    map[k] = set;
  }
  return map;
}

/** Réservations qui occupent un créneau (les demandes échues ne bloquent plus). */
function bookingBlockers(bookings, from, to, now, excludeRef) {
  var out = [];
  bookings.forEach(function (b) {
    if (BLOCKING.indexOf(b.statusCode) < 0 || b.ref === excludeRef) return;
    if (b.statusCode !== "CONFIRMED" && b.holdIso && new Date(b.holdIso).getTime() <= now) return;
    var s = new Date(b.startIso).getTime();
    var e = new Date(b.endIso).getTime();
    if (s < to && e > from) out.push({ start: s, end: e, kind: b.statusCode === "CONFIRMED" ? "busy" : "held" });
  });
  return out;
}

var TRANSITIONS = {
  PENDING: ["CONFIRMED", "DECLINED", "RESCHEDULE_PROPOSED", "EXPIRED", "CANCELLED"],
  RESCHEDULE_PROPOSED: ["CONFIRMED", "CANCELLED", "EXPIRED", "RESCHEDULE_PROPOSED"],
  CONFIRMED: ["CANCELLED", "COMPLETED", "RESCHEDULE_PROPOSED"],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: [],
  COMPLETED: [],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).indexOf(to) >= 0;
}

/* ═════════════════════════════ Validation ═════════════════════════════ */

function clean(v, max) {
  return String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, max);
}

function isEmail(s) {
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s) && s.length <= 200;
}

function looksLikeBot(p, minSeconds, now) {
  if (p.website && String(p.website).trim() !== "") return true;
  var started = Number(p.startedAt);
  if (!isFinite(started) || started <= 0) return true;
  var elapsed = (now - started) / 1000;
  return elapsed < minSeconds || elapsed > 86400;
}

function validateBooking(p) {
  var e = {};
  var out = {
    firstName: clean(p.firstName, 80),
    lastName: clean(p.lastName, 80),
    email: clean(p.email, 200).toLowerCase(),
    locale: ["fr", "nl", "en"].indexOf(p.locale) >= 0 ? p.locale : "fr",
    date: clean(p.date, 10),
    startMinute: hmToMinute(p.start),
    duration: Math.round(Number(p.durationMinutes) || 0),
    project: clean(p.projectDescription, 3000),
    placement: clean(p.placement, 120),
    size: clean(p.approximateSize, 60),
    style: clean(p.style, 120),
    comment: clean(p.comment, 2000),
  };
  if (!out.firstName) e.firstName = "required";
  if (!out.lastName) e.lastName = "required";
  if (!out.email) e.email = "required";
  else if (!isEmail(out.email)) e.email = "invalid_email";
  if (!out.project) e.projectDescription = "required";
  else if (out.project.length < 20) e.projectDescription = "too_short";
  if (p.consent !== true && p.consent !== "true") e.consent = "consent_required";
  if (!isDateKey(out.date) || isNaN(out.startMinute) || out.duration < 60 || out.duration > 540) e.form = "invalid";
  return { value: out, errors: e };
}

function validateContact(p) {
  var e = {};
  var out = {
    firstName: clean(p.firstName, 80),
    lastName: clean(p.lastName, 80),
    email: clean(p.email, 200).toLowerCase(),
    locale: ["fr", "nl", "en"].indexOf(p.locale) >= 0 ? p.locale : "fr",
    subject: clean(p.subject, 150),
    message: clean(p.message, 5000),
  };
  if (!out.firstName) e.firstName = "required";
  if (!out.lastName) e.lastName = "required";
  if (!out.email) e.email = "required";
  else if (!isEmail(out.email)) e.email = "invalid_email";
  if (out.subject.length < 2) e.subject = "required";
  if (out.message.length < 10) e.message = out.message ? "too_short" : "required";
  if (p.consent !== true && p.consent !== "true") e.consent = "consent_required";
  return { value: out, errors: e };
}

/* ═════════════════════════════ E-mails (FR / NL / EN) ═════════════════════════════ */

var C = { lightBrown: "#98755B", cream: "#E2D1C2", choc: "#442913", sand: "#D4BBAC", nut: "#5C3422", ivory: "#FBF8F3" };

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function nl2br(s) {
  return esc(s).replace(/\r?\n/g, "<br>");
}

var DATE_WORDS = {
  fr: { days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"], months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] },
  nl: { days: ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"], months: ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"] },
  en: { days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
};

function formatDateLong(d, locale) {
  var p = localParts(d);
  var w = DATE_WORDS[locale] || DATE_WORDS.fr;
  if (locale === "en") return w.days[p.weekday] + " " + p.d + " " + w.months[p.mo - 1] + " " + p.y;
  return w.days[p.weekday] + " " + p.d + " " + w.months[p.mo - 1] + " " + p.y;
}
function formatTime(d) {
  var p = localParts(d);
  return pad(p.h) + ":" + pad(p.mi);
}
function formatDuration(minutes, locale) {
  return Math.floor(minutes / 60) + (locale === "nl" ? " u" : " h") + (minutes % 60 ? " " + pad(minutes % 60) : "");
}

var T = {
  fr: {
    hello: "Bonjour",
    labels: ["Date", "Horaire", "Durée", "Référence", "Projet"],
    footer: "Cet e-mail vous est envoyé suite à votre demande sur notre site.",
    received: ["Demande reçue — en attente de confirmation", "Demande de rendez-vous", "Votre demande est bien arrivée", "Nous avons bien reçu votre demande de rendez-vous. Votre créneau est en attente de confirmation par SOFTLINEBY.CLA.", "<strong>Ce n'est pas encore un rendez-vous confirmé.</strong> Le créneau est mis de côté pour vous pendant {h} h au maximum ; vous recevrez un nouvel e-mail dès que l'artiste aura étudié votre projet."],
    confirmed: ["Votre rendez-vous est confirmé", "Rendez-vous confirmé", "C'est confirmé", "Votre rendez-vous avec SOFTLINEBY.CLA est confirmé. Vous trouverez le récapitulatif ci-dessous et un fichier à ajouter à votre agenda.", "Un empêchement ? Répondez simplement à cet e-mail le plus tôt possible."],
    declined: ["Votre demande de rendez-vous", "Demande de rendez-vous", "Ce créneau n'a pas pu être retenu", "Merci pour votre demande. Malheureusement, SOFTLINEBY.CLA ne peut pas donner suite à votre demande pour ce créneau.", "Choisir un autre moment"],
    proposal: ["Proposition d'un nouveau créneau", "Nouveau créneau proposé", "Un autre moment vous conviendrait-il ?", "SOFTLINEBY.CLA vous propose un nouveau créneau pour votre projet. Il ne sera confirmé qu'après votre accord.", "Accepter ce créneau", "Refuser", "Sans réponse de votre part sous {h} h, la proposition expirera et le créneau sera libéré."],
    cancelled: ["Votre rendez-vous a été annulé", "Annulation", "Rendez-vous annulé", "Votre rendez-vous avec SOFTLINEBY.CLA a été annulé.", "Vous avez refusé le créneau proposé : votre demande est clôturée. N'hésitez pas à en faire une nouvelle quand vous le souhaitez.", "Faire une nouvelle demande"],
    expired: ["Votre demande a expiré", "Demande de rendez-vous", "Votre demande a expiré", "Votre demande n'a pas pu être confirmée dans le délai prévu : elle a été clôturée et le créneau a été libéré. Nous en sommes désolés.", "Faire une nouvelle demande"],
    contactAck: ["Nous avons bien reçu votre message", "Contact", "Merci pour votre message", "Votre message a bien été transmis à SOFTLINEBY.CLA. Une réponse vous sera apportée dès que possible.", "Sujet"],
    fromArtist: "Message de l'artiste",
  },
  nl: {
    hello: "Hallo",
    labels: ["Datum", "Tijdstip", "Duur", "Referentie", "Project"],
    footer: "Je ontvangt deze e-mail naar aanleiding van je aanvraag op onze website.",
    received: ["Aanvraag ontvangen — wacht op bevestiging", "Afspraakaanvraag", "Je aanvraag is goed aangekomen", "We hebben je afspraakaanvraag goed ontvangen. Je tijdslot wacht op bevestiging door SOFTLINEBY.CLA.", "<strong>Dit is nog geen bevestigde afspraak.</strong> Het tijdslot wordt maximaal {h} uur voor je vastgehouden; je krijgt een nieuwe e-mail zodra de artiest je project heeft bekeken."],
    confirmed: ["Je afspraak is bevestigd", "Afspraak bevestigd", "Het is bevestigd", "Je afspraak bij SOFTLINEBY.CLA is bevestigd. Hieronder vind je het overzicht en een bestand om aan je agenda toe te voegen.", "Verhinderd? Beantwoord deze e-mail dan zo snel mogelijk."],
    declined: ["Je afspraakaanvraag", "Afspraakaanvraag", "Dit tijdslot kon niet worden vastgelegd", "Bedankt voor je aanvraag. Helaas kan SOFTLINEBY.CLA niet ingaan op je aanvraag voor dit tijdslot.", "Een ander moment kiezen"],
    proposal: ["Voorstel voor een nieuw tijdslot", "Nieuw tijdslot voorgesteld", "Past een ander moment je?", "SOFTLINEBY.CLA stelt een nieuw tijdslot voor je project voor. Het wordt pas bevestigd na jouw akkoord.", "Dit tijdslot aanvaarden", "Weigeren", "Zonder antwoord binnen {h} uur vervalt het voorstel en komt het tijdslot weer vrij."],
    cancelled: ["Je afspraak werd geannuleerd", "Annulering", "Afspraak geannuleerd", "Je afspraak bij SOFTLINEBY.CLA werd geannuleerd.", "Je hebt het voorgestelde tijdslot geweigerd: je aanvraag is afgesloten. Je kunt altijd een nieuwe aanvraag doen.", "Nieuwe aanvraag doen"],
    expired: ["Je aanvraag is verlopen", "Afspraakaanvraag", "Je aanvraag is verlopen", "Je aanvraag kon niet binnen de voorziene termijn worden bevestigd: ze werd afgesloten en het tijdslot kwam weer vrij. Excuses daarvoor.", "Nieuwe aanvraag doen"],
    contactAck: ["We hebben je bericht ontvangen", "Contact", "Bedankt voor je bericht", "Je bericht werd doorgestuurd naar SOFTLINEBY.CLA. Je krijgt zo snel mogelijk een antwoord.", "Onderwerp"],
    fromArtist: "Bericht van de artiest",
  },
  en: {
    hello: "Hello",
    labels: ["Date", "Time", "Duration", "Reference", "Project"],
    footer: "You are receiving this email following your request on our website.",
    received: ["Request received — awaiting confirmation", "Appointment request", "Your request has arrived", "We have received your appointment request. Your time slot is awaiting confirmation by SOFTLINEBY.CLA.", "<strong>This is not a confirmed appointment yet.</strong> The slot is held for you for up to {h} hours; you will receive another email as soon as the artist has reviewed your project."],
    confirmed: ["Your appointment is confirmed", "Appointment confirmed", "You're booked in", "Your appointment with SOFTLINEBY.CLA is confirmed. Please find the summary below and a file to add it to your calendar.", "Can't make it? Simply reply to this email as early as possible."],
    declined: ["Your appointment request", "Appointment request", "This slot could not be accepted", "Thank you for your request. Unfortunately, SOFTLINEBY.CLA is unable to accept your request for this time slot.", "Choose another time"],
    proposal: ["A new time slot has been proposed", "New time proposed", "Would another time suit you?", "SOFTLINEBY.CLA is proposing a new time slot for your project. It will only be confirmed once you accept it.", "Accept this slot", "Decline", "If we don't hear from you within {h} hours, the proposal will expire and the slot will be released."],
    cancelled: ["Your appointment has been cancelled", "Cancellation", "Appointment cancelled", "Your appointment with SOFTLINEBY.CLA has been cancelled.", "You declined the proposed time slot, so your request is now closed. You are welcome to make a new one at any time.", "Make a new request"],
    expired: ["Your request has expired", "Appointment request", "Your request has expired", "Your request could not be confirmed within the expected time, so it has been closed and the slot released. We apologise for this.", "Make a new request"],
    contactAck: ["We have received your message", "Contact", "Thank you for your message", "Your message has been passed on to SOFTLINEBY.CLA. You will receive a reply as soon as possible.", "Subject"],
    fromArtist: "Message from the artist",
  },
};

function layout(o) {
  var rows = (o.rows || [])
    .map(function (r) {
      return '<tr><td style="padding:12px 0;border-bottom:1px solid ' + C.sand + ";font:600 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:" + C.nut + ';width:38%;vertical-align:top;">' + esc(r[0]) + '</td><td style="padding:12px 0;border-bottom:1px solid ' + C.sand + ";font:400 15px/1.5 Helvetica,Arial,sans-serif;color:" + C.choc + ';vertical-align:top;">' + r[1] + "</td></tr>";
    })
    .join("");
  var btn = function (b, primary) {
    return '<a href="' + esc(b.href) + '" style="display:inline-block;margin:6px 8px 6px 0;padding:15px 28px;border-radius:999px;font:600 13px/1 Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;' + (primary ? "background:" + C.nut + ";color:" + C.ivory + ";border:1px solid " + C.nut + ";" : "color:" + C.nut + ";border:1px solid " + C.nut + ";") + '">' + esc(b.label) + "</a>";
  };
  var html =
    '<!doctype html><html lang="' + o.locale + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(o.title) + "</title></head>" +
    '<body style="margin:0;padding:0;background:' + C.ivory + ';"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + esc(o.preheader) + "</div>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.ivory + ';"><tr><td align="center" style="padding:40px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">' +
    '<tr><td align="center" style="padding:0 0 28px;"><img src="' + esc(o.siteUrl) + '/brand/logo-ink.png" width="132" alt="' + BRAND + '" style="display:block;width:132px;height:auto;border:0;"></td></tr>' +
    '<tr><td style="background:#ffffff;border:1px solid ' + C.cream + ';border-radius:20px;padding:40px 36px;">' +
    '<p style="margin:0 0 14px;font:600 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:' + C.nut + ';">' + esc(o.eyebrow) + "</p>" +
    '<h1 style="margin:0 0 22px;font:italic 400 30px/1.2 Georgia,\'Times New Roman\',serif;color:' + C.choc + ';">' + esc(o.title) + "</h1>" +
    o.paragraphs.map(function (p) {
      return '<p style="margin:0 0 14px;font:400 15px/1.65 Helvetica,Arial,sans-serif;color:' + C.choc + ';">' + p + "</p>";
    }).join("") +
    (rows ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;border-top:1px solid ' + C.sand + ';">' + rows + "</table>" : "") +
    (o.button || o.secondary ? '<div style="margin:28px 0 8px;">' + (o.button ? btn(o.button, true) : "") + (o.secondary ? btn(o.secondary, false) : "") + "</div>" : "") +
    (o.note ? '<p style="margin:24px 0 0;padding:16px 18px;background:' + C.ivory + ";border-left:2px solid " + C.lightBrown + ";font:400 13px/1.6 Helvetica,Arial,sans-serif;color:" + C.nut + ';">' + o.note + "</p>" : "") +
    "</td></tr>" +
    '<tr><td align="center" style="padding:24px 12px 0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:' + C.nut + ';">' + esc(o.footer) + '<br><a href="' + esc(o.siteUrl) + "/" + o.locale + '/" style="color:' + C.nut + ';">softlineby.cla</a></td></tr>' +
    "</table></td></tr></table></body></html>";
  var strip = function (h) {
    return String(h).replace(/<br>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  };
  var text = [BRAND, "", o.title, ""]
    .concat(o.paragraphs.map(strip), [""], (o.rows || []).map(function (r) { return r[0] + " : " + strip(r[1]); }), [""])
    .concat(o.button ? [o.button.label + " : " + o.button.href] : [], o.secondary ? [o.secondary.label + " : " + o.secondary.href] : [], o.note ? ["", strip(o.note)] : [], ["", o.footer])
    .join("\n");
  return { html: html, text: text };
}

function bookingRows(b, locale, withProject) {
  var L = T[locale].labels;
  var s = new Date(b.startIso);
  var e = new Date(b.endIso);
  var rows = [
    [L[0], esc(formatDateLong(s, locale))],
    [L[1], formatTime(s) + " – " + formatTime(e)],
    [L[2], formatDuration(Math.round((e - s) / 60000), locale)],
    [L[3], esc(b.ref)],
  ];
  if (withProject) rows.push([L[4], nl2br(b.project)]);
  return rows;
}

function artistMessage(locale, message) {
  return message && String(message).trim() ? ["<em>" + esc(T[locale].fromArtist) + " :</em><br>" + nl2br(String(message).trim())] : [];
}

function buildIcs(b, cancelled) {
  var f = function (d) {
    return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SOFTLINEBY.CLA//Booking//FR", "CALSCALE:GREGORIAN", "METHOD:" + (cancelled ? "CANCEL" : "PUBLISH"),
    "BEGIN:VEVENT", "UID:" + b.ref + "@softlineby.cla", "DTSTAMP:" + f(new Date()), "DTSTART:" + f(b.startIso), "DTEND:" + f(b.endIso),
    "SUMMARY:SOFTLINEBY.CLA — " + (b.locale === "nl" ? "tatoeage" : b.locale === "en" ? "tattoo" : "tatouage"), "DESCRIPTION:" + b.ref,
    "STATUS:" + (cancelled ? "CANCELLED" : "CONFIRMED"), "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

/** Construit un e-mail client. type : received | confirmed | declined | proposal | cancelled | cancelledByClient | expired */
function clientEmail(type, b, cfg, extra) {
  extra = extra || {};
  var l = T[b.locale] ? b.locale : "fr";
  var t = T[l];
  var site = cfg.siteUrl;
  var bookingUrl = site + "/" + l + "/booking/";
  var hello = esc(t.hello) + " " + esc(b.firstName) + ",";
  var o = { locale: l, siteUrl: site, footer: t.footer };
  var subject;
  var attachments;
  if (type === "received") {
    var r = t.received;
    subject = r[0];
    o.eyebrow = r[1]; o.title = r[2]; o.preheader = r[3];
    o.paragraphs = [hello, esc(r[3])];
    o.rows = bookingRows(b, l, true);
    o.note = r[4].replace("{h}", cfg.pendingHoldHours);
  } else if (type === "confirmed") {
    var c = t.confirmed;
    subject = c[0];
    o.eyebrow = c[1]; o.title = c[2]; o.preheader = c[3];
    o.paragraphs = [hello, esc(c[3])].concat(artistMessage(l, extra.message));
    o.rows = bookingRows(b, l);
    o.note = esc(c[4]);
    attachments = [{ name: b.ref + ".ics", type: "text/calendar", content: buildIcs(b) }];
  } else if (type === "declined") {
    var d = t.declined;
    subject = d[0];
    o.eyebrow = d[1]; o.title = d[2]; o.preheader = d[3];
    o.paragraphs = [hello, esc(d[3])].concat(artistMessage(l, extra.message));
    o.rows = bookingRows(b, l);
    o.button = { label: d[4], href: bookingUrl };
  } else if (type === "proposal") {
    var p = t.proposal;
    subject = p[0];
    o.eyebrow = p[1]; o.title = p[2]; o.preheader = p[3];
    o.paragraphs = [hello, esc(p[3])].concat(artistMessage(l, extra.message));
    o.rows = bookingRows(b, l);
    o.button = { label: p[4], href: extra.responseUrl + "&choice=accept" };
    o.secondary = { label: p[5], href: extra.responseUrl + "&choice=decline" };
    o.note = esc(p[6].replace("{h}", cfg.proposalHoldHours));
  } else if (type === "cancelled" || type === "cancelledByClient") {
    var x = t.cancelled;
    var lead = type === "cancelledByClient" ? x[4] : x[3];
    subject = x[0];
    o.eyebrow = x[1]; o.title = x[2]; o.preheader = lead;
    o.paragraphs = [hello, esc(lead)].concat(artistMessage(l, extra.message));
    o.rows = bookingRows(b, l);
    o.button = { label: x[5], href: bookingUrl };
    attachments = type === "cancelled" ? [{ name: b.ref + ".ics", type: "text/calendar", content: buildIcs(b, true) }] : undefined;
  } else if (type === "expired") {
    var ex = t.expired;
    subject = ex[0];
    o.eyebrow = ex[1]; o.title = ex[2]; o.preheader = ex[3];
    o.paragraphs = [hello, esc(ex[3])];
    o.rows = bookingRows(b, l);
    o.button = { label: ex[4], href: bookingUrl };
  }
  var body = layout(o);
  return { to: b.email, subject: subject + " · " + b.ref, html: body.html, text: body.text, replyTo: cfg.notifyEmail || undefined, attachments: attachments };
}

function adminNewEmail(b, cfg, extra) {
  var rows = [
    ["Client", esc(b.firstName) + " " + esc(b.lastName)],
    ["E-mail", esc(b.email)],
    ["Langue", String(b.locale).toUpperCase()],
  ].concat(bookingRows(b, "fr"), [["Projet", nl2br(b.project)]]);
  if (b.placement) rows.push(["Zone du corps", esc(b.placement)]);
  if (b.size) rows.push(["Taille", esc(b.size)]);
  if (b.style) rows.push(["Style", esc(b.style)]);
  if (b.comment) rows.push(["Commentaire", nl2br(b.comment)]);
  rows.push(["Références", extra.files ? extra.files + " image(s) — lien dans le tableur (privé)" : "Aucune"]);
  var body = layout({
    locale: "fr", siteUrl: cfg.siteUrl, eyebrow: "Nouvelle demande", title: b.firstName + " " + b.lastName,
    preheader: "Nouvelle demande de " + b.firstName + " " + b.lastName,
    paragraphs: ["Une nouvelle demande de rendez-vous attend votre décision. Le créneau est bloqué provisoirement.", "Pour répondre : dans le tableur, colonne <strong>« ➜ Décision »</strong> de cette ligne, choisissez Accepter, Refuser ou Proposer le nouveau créneau."],
    rows: rows,
    button: extra.sheetUrl ? { label: "Ouvrir le tableur", href: extra.sheetUrl } : null,
    note: extra.calendarWarning ? "⚠︎ Google Agenda n'a pas pu être consulté au moment de la demande : vérifiez votre agenda avant d'accepter." : null,
    footer: "Notification automatique de votre site.",
  });
  return { to: cfg.notifyEmail, subject: "Nouvelle demande · " + b.firstName + " " + b.lastName + " · " + formatDateLong(new Date(b.startIso), "fr") + " " + formatTime(new Date(b.startIso)), html: body.html, text: body.text, replyTo: b.email };
}

function adminAnswerEmail(b, cfg, accepted) {
  var body = layout({
    locale: "fr", siteUrl: cfg.siteUrl, eyebrow: accepted ? "Proposition acceptée" : "Proposition refusée", title: b.firstName + " " + b.lastName,
    preheader: accepted ? "Créneau accepté par le client" : "Créneau refusé par le client",
    paragraphs: [accepted ? "Le client a accepté le nouveau créneau : le rendez-vous est confirmé et l'e-mail de confirmation lui est envoyé." : "Le client a refusé le nouveau créneau : la demande est clôturée et le créneau libéré."],
    rows: bookingRows(b, "fr"),
    footer: "Notification automatique de votre site.",
  });
  return { to: cfg.notifyEmail, subject: (accepted ? "✓ Créneau accepté · " : "✕ Créneau refusé · ") + b.firstName + " " + b.lastName, html: body.html, text: body.text, replyTo: b.email };
}

function contactEmails(m, cfg) {
  var out = [];
  var admin = layout({
    locale: "fr", siteUrl: cfg.siteUrl, eyebrow: "Nouveau message", title: m.subject, preheader: m.subject,
    paragraphs: ["De <strong>" + esc(m.firstName) + " " + esc(m.lastName) + "</strong> (" + esc(m.email) + ") — langue " + m.locale.toUpperCase(), nl2br(m.message)],
    note: "Répondez directement à cet e-mail : la réponse partira vers l'adresse du client.",
    footer: "Notification automatique de votre site.",
  });
  out.push({ to: cfg.notifyEmail, subject: "Message · " + m.subject, html: admin.html, text: admin.text, replyTo: m.email });
  if (cfg.contactAutoReply) {
    var t = T[m.locale].contactAck;
    var ack = layout({
      locale: m.locale, siteUrl: cfg.siteUrl, eyebrow: t[1], title: t[2], preheader: t[3],
      paragraphs: [esc(T[m.locale].hello) + " " + esc(m.firstName) + ",", esc(t[3])],
      rows: [[t[4], esc(m.subject)], ["Message", nl2br(m.message)]],
      footer: T[m.locale].footer,
    });
    out.push({ to: m.email, subject: t[0], html: ack.html, text: ack.text, replyTo: cfg.notifyEmail || undefined });
  }
  return out;
}

/* ═════════════════════════════ Logique métier (indépendante de Google : testée) ═════════════════════════════ */

function Fail(code, message) {
  this.code = code;
  this.message = message || code;
}

function rejectionCode(r) {
  return { outside_range: "OUTSIDE_RANGE", not_open: "SLOT_UNAVAILABLE", too_soon: "TOO_SOON", outside_window: "OUTSIDE_RANGE", conflict: "SLOT_UNAVAILABLE", held: "SLOT_HELD" }[r] || "SLOT_UNAVAILABLE";
}

function displayFields(b) {
  var s = new Date(b.startIso);
  var e = new Date(b.endIso);
  var p = localParts(s);
  var short = { fr: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."] }.fr;
  b.date = short[p.weekday] + " " + pad(p.d) + "/" + pad(p.mo) + "/" + p.y;
  b.start = formatTime(s);
  b.end = formatTime(e);
  b.duration = formatDuration(Math.round((e - s) / 60000), "fr");
  b.status = STATUS[b.statusCode];
  b.holdUntil = b.holdIso && b.statusCode !== "CONFIRMED" ? formatDateLong(new Date(b.holdIso), "fr") + " " + formatTime(new Date(b.holdIso)) : "";
  return b;
}

function fullStamp(now) {
  var p = localParts(new Date(now));
  return pad(p.d) + "/" + pad(p.mo) + "/" + p.y + " " + pad(p.h) + ":" + pad(p.mi);
}

function stamp(now) {
  var p = localParts(new Date(now));
  return pad(p.d) + "/" + pad(p.mo) + " " + pad(p.h) + ":" + pad(p.mi);
}

function addHistory(b, now, text) {
  b.history = (b.history ? b.history + "\n" : "") + stamp(now) + " — " + text;
}

function newReference(store) {
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (var i = 0; i < 10; i++) {
    var ref = "SLC-";
    for (var j = 0; j < 6; j++) ref += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    if (!store.findByRef(ref)) return ref;
  }
  throw new Fail("ERROR");
}

/** Disponibilités publiques d'un mois : uniquement des états de créneaux, jamais d'information sur les clients. */
function apiAvailability(store, params, now) {
  var month = String(params.month || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, code: "INVALID" };
  var cfg = store.settings();
  var maxDur = cfg.maxDurationHours * 60;
  var duration = Math.min(Math.max(SLOT, Math.round((Number(params.duration) || 60) / SLOT) * SLOT), maxDur);
  var dates = daysInMonth(month);
  var from = zonedToUtc(dates[0], 0).getTime();
  var to = zonedToUtc(addDays(dates[dates.length - 1], 1), 0).getTime();
  var open = openHours(store, cfg, dates[0], dates[dates.length - 1]);
  var blockers = bookingBlockers(store.bookings(), from, to, now)
    .concat(store.blocked(from, to).map(function (i) { return { start: i.start, end: i.end, kind: "busy" }; }))
    .concat(store.busy(from, to, true).intervals.map(function (i) { return { start: i.start, end: i.end, kind: "busy" }; }));
  var opts = { duration: duration, now: now, minNoticeMinutes: cfg.minNoticeHours * 60, maxAdvanceDays: cfg.maxAdvanceDays };
  var today = localParts(new Date(now)).dateKey;
  return {
    ok: true,
    month: month,
    today: today,
    maxDate: addDays(today, cfg.maxAdvanceDays),
    durationMinutes: duration,
    maxDurationMinutes: maxDur,
    days: dates.map(function (d) {
      return computeDay(d, open[d] || {}, blockers, opts);
    }),
  };
}

/** Expire les demandes dont le délai est dépassé et prévient les clients (appelée sous verrou). */
function expireDue(store, now) {
  var cfg = store.settings();
  var n = 0;
  store.bookings().forEach(function (b) {
    if ((b.statusCode === "PENDING" || b.statusCode === "RESCHEDULE_PROPOSED") && b.holdIso && new Date(b.holdIso).getTime() <= now) {
      b.statusCode = "EXPIRED";
      b.tokenHash = "";
      addHistory(b, now, "Expirée automatiquement (aucune décision dans le délai)");
      store.save(displayFields(b));
      store.syncEvent(b);
      store.sendMail(clientEmail("expired", b, cfg), b.ref, "Expiration");
      n++;
    }
  });
  return n;
}

function apiBook(store, p, now) {
  if (looksLikeBot(p, 4, now)) return { ok: false, code: "SPAM" };
  var v = validateBooking(p);
  if (Object.keys(v.errors).length) return { ok: false, code: "VALIDATION", fieldErrors: v.errors };
  var x = v.value;
  if (!store.rateLimit("book:" + x.email, 4, 3600) || !store.rateLimit("book:all", 30, 600)) return { ok: false, code: "RATE_LIMITED" };

  var files = (p.references || []).slice(0, 4);
  if (files.length > 3) return { ok: false, code: "VALIDATION", fieldErrors: { references: "file_count" } };
  for (var i = 0; i < files.length; i++) {
    if (!/^image\/(jpeg|png|webp)$/.test(files[i].type) || !files[i].data || String(files[i].data).length > 2200000) {
      return { ok: false, code: "VALIDATION", fieldErrors: { references: "file_type" } };
    }
  }

  var cfg = store.settings();
  if (x.duration > cfg.maxDurationHours * 60) return { ok: false, code: "OUTSIDE_RANGE" };
  var dayFrom = zonedToUtc(x.date, 0).getTime();
  var dayTo = zonedToUtc(addDays(x.date, 1), 0).getTime();
  var busy = store.busy(dayFrom, dayTo, false);

  var booking;
  try {
    booking = store.withLock(function () {
    expireDue(store, now);
    var open = openHours(store, cfg, x.date, x.date)[x.date] || {};
    var blockers = bookingBlockers(store.bookings(), dayFrom, dayTo, now)
      .concat(store.blocked(dayFrom, dayTo).map(function (i) { return { start: i.start, end: i.end, kind: "busy" }; }))
      .concat(busy.intervals.map(function (i) { return { start: i.start, end: i.end, kind: "busy" }; }));
    var r = checkInterval(x.date, x.startMinute, open, blockers, { duration: x.duration, now: now, minNoticeMinutes: cfg.minNoticeHours * 60, maxAdvanceDays: cfg.maxAdvanceDays });
    if (r) throw new Fail(rejectionCode(r));
    var start = zonedToUtc(x.date, x.startMinute);
    var end = new Date(start.getTime() + x.duration * 60000);
    var b = {
      ref: newReference(store),
      createdAt: fullStamp(now),
      firstName: x.firstName,
      lastName: x.lastName,
      email: x.email,
      project: x.project,
      placement: x.placement,
      size: x.size,
      style: x.style,
      comment: x.comment,
      locale: x.locale,
      notes: "",
      eventId: "",
      references: "",
      fileIds: "",
      decision: "",
      finalHours: "",
      newDate: "",
      newTime: "",
      clientMessage: "",
      history: "",
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      requestedIso: start.toISOString(),
      estimatedMinutes: x.duration,
      statusCode: "PENDING",
      holdIso: new Date(now + cfg.pendingHoldHours * 3600000).toISOString(),
      tokenHash: "",
      calendarState: busy.checked ? "" : "non vérifié",
    };
    addHistory(b, now, "Demande reçue (" + formatDuration(x.duration, "fr") + ")" + (busy.checked ? "" : " — ⚠ Google Agenda non vérifié"));
    store.insert(displayFields(b));
    return b;
  });
  } catch (err) {
    if (err instanceof Fail) return { ok: false, code: err.code };
    throw err;
  }

  // La demande est enregistrée : les étapes suivantes ne peuvent plus la faire perdre.
  if (files.length) {
    try {
      var saved = store.saveFiles(booking, files);
      booking.references = saved.links.join("\n");
      booking.fileIds = saved.ids.join(",");
      store.save(booking);
    } catch (err) {
      store.log("Images", booking.ref, "", "Échec", String(err && err.message ? err.message : err));
    }
  }
  store.syncEvent(booking);
  store.sendMail(clientEmail("received", booking, cfg), booking.ref, "Accusé de réception");
  if (cfg.notifyEmail) {
    store.sendMail(adminNewEmail(booking, cfg, { files: files.length, sheetUrl: store.rowUrl(booking), calendarWarning: !busy.checked && store.calendarConfigured() }), booking.ref, "Notification artiste");
  }
  return { ok: true, reference: booking.ref };
}

/** Vérifie qu'une plage choisie par l'artiste est libre (autres réservations, indisponibilités, Google Agenda). */
function assertFree(store, ref, start, end, now) {
  var s = localParts(start);
  var e = localParts(end);
  var endMinute = e.dateKey === s.dateKey ? e.minute : e.minute + 1440;
  if (s.minute < DAY_START || endMinute > DAY_END || e.dateKey !== s.dateKey) throw new Fail("OUTSIDE_RANGE", "Le rendez-vous doit se situer entre 11:00 et 20:00.");
  var iv = { start: start.getTime(), end: end.getTime() };
  var others = bookingBlockers(store.bookings(), iv.start, iv.end, now, ref).concat(store.blocked(iv.start, iv.end));
  if (others.some(function (o) { return overlaps(iv, o); })) throw new Fail("CONFLICT", "Cette plage chevauche une autre réservation ou une indisponibilité.");
  var busy = store.busy(zonedToUtc(s.dateKey, 0).getTime(), zonedToUtc(addDays(s.dateKey, 1), 0).getTime(), false);
  if (busy.intervals.some(function (o) { return overlaps(iv, o); })) throw new Fail("CONFLICT", "Cette plage est occupée dans votre Google Agenda.");
}

/** Décision de l'artiste (colonne « ➜ Décision » du tableur). */
function decide(store, ref, decisionLabel, now) {
  var cfg = store.settings();
  var key = Object.keys(DECISIONS).filter(function (k) { return DECISIONS[k] === decisionLabel; })[0];
  if (!key) return { ok: false, message: "Décision inconnue." };
  var mails = [];
  var result = store.withLock(function () {
    var b = store.findByRef(ref);
    if (!b) throw new Fail("NOT_FOUND", "Réservation introuvable.");
    var message = String(b.clientMessage || "").trim();
    var hours = Number(String(b.finalHours || "").replace(",", "."));
    var currentMinutes = Math.round((new Date(b.endIso) - new Date(b.startIso)) / 60000);
    var duration = hours > 0 ? Math.round(hours) * 60 : currentMinutes;

    if (key === "accept") {
      if (b.statusCode !== "PENDING") throw new Fail("INVALID_TRANSITION", "Seule une demande « En attente » peut être acceptée.");
      var end = new Date(new Date(b.startIso).getTime() + duration * 60000);
      if (end.getTime() !== new Date(b.endIso).getTime()) assertFree(store, b.ref, new Date(b.startIso), end, now);
      b.endIso = end.toISOString();
      b.statusCode = "CONFIRMED";
      b.holdIso = "";
      addHistory(b, now, "Acceptée (" + formatDuration(duration, "fr") + ")" + (message ? " — message : « " + message + " »" : ""));
      mails.push([clientEmail("confirmed", b, cfg, { message: message }), "Confirmation"]);
    } else if (key === "decline") {
      if (b.statusCode !== "PENDING") throw new Fail("INVALID_TRANSITION", "Seule une demande « En attente » peut être refusée.");
      b.statusCode = "DECLINED";
      b.holdIso = "";
      addHistory(b, now, "Refusée" + (message ? " — message : « " + message + " »" : ""));
      mails.push([clientEmail("declined", b, cfg, { message: message }), "Refus"]);
    } else if (key === "propose") {
      if (!canTransition(b.statusCode, "RESCHEDULE_PROPOSED")) throw new Fail("INVALID_TRANSITION", "Impossible de proposer un créneau pour une réservation « " + STATUS[b.statusCode] + " ».");
      var dateKey = toDateKey(b.newDate);
      var minute = hmToMinute(b.newTime instanceof Date ? formatTime(b.newTime) : b.newTime);
      if (!dateKey || isNaN(minute)) throw new Fail("INVALID", "Remplissez « Nouvelle date » et « Nouvelle heure » avant de proposer.");
      var start = zonedToUtc(dateKey, minute);
      if (start.getTime() <= now) throw new Fail("TOO_SOON", "Le créneau proposé est déjà passé.");
      var pEnd = new Date(start.getTime() + duration * 60000);
      assertFree(store, b.ref, start, pEnd, now);
      var token = store.newToken();
      b.tokenHash = store.hash(token);
      b.startIso = start.toISOString();
      b.endIso = pEnd.toISOString();
      b.statusCode = "RESCHEDULE_PROPOSED";
      b.holdIso = new Date(now + cfg.proposalHoldHours * 3600000).toISOString();
      b.newDate = "";
      b.newTime = "";
      addHistory(b, now, "Nouveau créneau proposé : " + formatDateLong(start, "fr") + " " + formatTime(start) + " (" + formatDuration(duration, "fr") + ")" + (message ? " — message : « " + message + " »" : ""));
      var url = cfg.siteUrl + "/" + b.locale + "/booking/response/?token=" + encodeURIComponent(token);
      mails.push([clientEmail("proposal", b, cfg, { message: message, responseUrl: url }), "Proposition"]);
    } else if (key === "cancel") {
      if (!canTransition(b.statusCode, "CANCELLED")) throw new Fail("INVALID_TRANSITION", "Cette réservation ne peut plus être annulée.");
      b.statusCode = "CANCELLED";
      b.holdIso = "";
      b.tokenHash = "";
      addHistory(b, now, "Annulée" + (message ? " — message : « " + message + " »" : ""));
      mails.push([clientEmail("cancelled", b, cfg, { message: message }), "Annulation"]);
    } else if (key === "complete") {
      if (b.statusCode !== "CONFIRMED") throw new Fail("INVALID_TRANSITION", "Seul un rendez-vous confirmé peut être marqué terminé.");
      b.statusCode = "COMPLETED";
      addHistory(b, now, "Rendez-vous terminé");
    }
    b.decision = "";
    b.clientMessage = "";
    b.finalHours = "";
    store.save(displayFields(b));
    return b;
  });
  store.syncEvent(result);
  mails.forEach(function (m) {
    store.sendMail(m[0], result.ref, m[1]);
  });
  return { ok: true, booking: result, message: STATUS[result.statusCode] };
}

function findByToken(store, token) {
  if (!token || String(token).length < 20 || String(token).length > 120) return null;
  var h = store.hash(String(token));
  var list = store.bookings().filter(function (b) { return b.tokenHash && b.tokenHash === h; });
  return list[0] || null;
}

function apiProposal(store, params, now) {
  var b = findByToken(store, params.token);
  if (!b || b.statusCode !== "RESCHEDULE_PROPOSED" || !b.holdIso || new Date(b.holdIso).getTime() <= now) return { ok: false, code: "EXPIRED" };
  // Seules les informations utiles à la décision sont renvoyées.
  return { ok: true, firstName: b.firstName, locale: b.locale, start: b.startIso, end: b.endIso, reference: b.ref, message: null, holdUntil: b.holdIso };
}

function apiRespond(store, p, now) {
  var choice = p.choice === "accept" ? "accept" : p.choice === "decline" ? "decline" : null;
  if (!choice) return { ok: false, code: "INVALID" };
  if (!store.rateLimit("respond:all", 60, 600)) return { ok: false, code: "RATE_LIMITED" };
  var cfg = store.settings();
  var b;
  try {
    b = store.withLock(function () {
    var found = findByToken(store, p.token);
    if (!found) throw new Fail("NOT_FOUND");
    if (found.statusCode !== "RESCHEDULE_PROPOSED") throw new Fail("INVALID_TRANSITION");
    if (!found.holdIso || new Date(found.holdIso).getTime() <= now) throw new Fail("EXPIRED");
    found.statusCode = choice === "accept" ? "CONFIRMED" : "CANCELLED";
    found.holdIso = "";
    found.tokenHash = "";
    addHistory(found, now, choice === "accept" ? "Le client a ACCEPTÉ le nouveau créneau" : "Le client a REFUSÉ le nouveau créneau");
    store.save(displayFields(found));
    return found;
  });
  } catch (err) {
    if (err instanceof Fail) return { ok: false, code: err.code };
    throw err;
  }
  store.syncEvent(b);
  store.sendMail(clientEmail(choice === "accept" ? "confirmed" : "cancelledByClient", b, cfg), b.ref, choice === "accept" ? "Confirmation" : "Clôture");
  if (cfg.notifyEmail) store.sendMail(adminAnswerEmail(b, cfg, choice === "accept"), b.ref, "Réponse client");
  return { ok: true, status: b.statusCode };
}

function apiContact(store, p, now) {
  if (looksLikeBot(p, 3, now)) return { ok: false, code: "SPAM" };
  var v = validateContact(p);
  if (Object.keys(v.errors).length) return { ok: false, code: "VALIDATION", fieldErrors: v.errors };
  if (!store.rateLimit("contact:" + v.value.email, 5, 3600) || !store.rateLimit("contact:all", 30, 600)) return { ok: false, code: "RATE_LIMITED" };
  var cfg = store.settings();
  store.addMessage(v.value, now); // enregistré avant tout envoi : le succès n'est renvoyé qu'après
  if (cfg.notifyEmail) {
    contactEmails(v.value, cfg).forEach(function (m, i) {
      store.sendMail(m, "", i === 0 ? "Message contact" : "Accusé contact");
    });
  }
  return { ok: true };
}

/** Maintenance horaire : expirations, rendez-vous passés, relances, purge RGPD. */
function maintenance(store, now) {
  var report = {};
  report.expired = store.withLock(function () {
    return expireDue(store, now);
  });
  var cfg = store.settings();
  var completed = 0;
  var anonymized = 0;
  var filesCut = now - cfg.attachmentRetentionDays * 86400000;
  var dataCut = now - cfg.dataRetentionMonths * 30.44 * 86400000;
  store.withLock(function () {
    store.bookings().forEach(function (b) {
      var end = new Date(b.endIso).getTime();
      var changed = false;
      if (b.statusCode === "CONFIRMED" && end < now - 86400000) {
        b.statusCode = "COMPLETED";
        addHistory(b, now, "Terminé automatiquement");
        completed++;
        changed = true;
      }
      var closed = ["COMPLETED", "DECLINED", "CANCELLED", "EXPIRED"].indexOf(b.statusCode) >= 0;
      if (b.fileIds && closed && end < filesCut) {
        store.deleteFiles(b.fileIds.split(","));
        b.fileIds = "";
        b.references = "(supprimées — délai de conservation)";
        changed = true;
      }
      if (closed && end < dataCut && b.firstName !== "—") {
        b.firstName = "—";
        b.lastName = "—";
        b.email = "anonymise@invalid";
        b.project = "[anonymisé]";
        b.placement = b.size = b.style = b.comment = b.notes = "";
        addHistory(b, now, "Données anonymisées (RGPD)");
        anonymized++;
        changed = true;
      }
      if (changed) store.save(displayFields(b));
      else if (b.calendarState === "à resynchroniser") store.syncEvent(b);
    });
  });
  report.completed = completed;
  report.anonymized = anonymized;
  report.messagesDeleted = store.purgeMessages(dataCut);
  report.mailsRetried = store.retryMails();
  if (!cfg.allOpen) store.extendAvailability(now);
  return report;
}

/* ═════════════════════════════ Stockage Google (Sheets, Agenda, Drive, Gmail) ═════════════════════════════ */

function props() {
  return PropertiesService.getScriptProperties();
}

function spreadsheet() {
  var id = props().getProperty("SPREADSHEET_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet(name) {
  var sh = spreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Onglet « " + name + " » introuvable : lancez le menu ✦ SOFTLINEBY.CLA → Installer / réparer.");
  return sh;
}

function yes(v) {
  return /^(oui|yes|ja|true|1|x)$/i.test(String(v).trim());
}

function SheetStore() {
  var cache = {};
  var self = this;

  this.settings = function () {
    if (cache.settings) return cache.settings;
    var values = sheet(SHEETS.settings).getDataRange().getValues();
    var map = {};
    values.forEach(function (r) {
      if (r[2]) map[r[2]] = r[1];
    });
    var s = {};
    SETTINGS.forEach(function (d) {
      var v = map[d[0]];
      s[d[0]] = v === "" || v == null ? d[2] : v;
    });
    ["pendingHoldHours", "proposalHoldHours", "minNoticeHours", "maxAdvanceDays", "maxDurationHours", "attachmentRetentionDays", "dataRetentionMonths"].forEach(function (k) {
      s[k] = Number(s[k]) || Number(SETTINGS.filter(function (d) { return d[0] === k; })[0][2]);
    });
    s.maxDurationHours = Math.min(9, Math.max(1, s.maxDurationHours));
    s.allOpen = yes(s.allOpen);
    s.useMainCalendar = yes(s.useMainCalendar);
    s.contactAutoReply = yes(s.contactAutoReply);
    s.siteUrl = String(s.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
    s.notifyEmail = String(s.notifyEmail || Session.getEffectiveUser().getEmail() || "").trim();
    cache.settings = s;
    return s;
  };

  this.withLock = function (fn) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      cache.bookings = null;
      return fn();
    } finally {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  };

  this.bookings = function () {
    if (cache.bookings) return cache.bookings;
    var sh = sheet(SHEETS.bookings);
    var last = sh.getLastRow();
    if (last < 2) return (cache.bookings = []);
    var values = sh.getRange(2, 1, last - 1, COLUMNS.length).getValues();
    cache.bookings = values
      .map(function (r, i) {
        var b = { row: i + 2 };
        COLUMNS.forEach(function (c, j) {
          b[c[0]] = r[j] instanceof Date ? r[j] : r[j] === null ? "" : r[j];
        });
        return b;
      })
      .filter(function (b) {
        return b.ref && b.startIso;
      });
    return cache.bookings;
  };

  this.findByRef = function (ref) {
    return self.bookings().filter(function (b) { return b.ref === ref; })[0] || null;
  };

  function toRow(b) {
    return COLUMNS.map(function (c) {
      var v = b[c[0]];
      return v == null ? "" : v;
    });
  }

  this.insert = function (b) {
    var sh = sheet(SHEETS.bookings);
    sh.appendRow(toRow(b));
    b.row = sh.getLastRow();
    if (cache.bookings) cache.bookings.push(b);
  };

  this.save = function (b) {
    if (!b.row) throw new Error("Ligne inconnue pour " + b.ref);
    sheet(SHEETS.bookings).getRange(b.row, 1, 1, COLUMNS.length).setValues([toRow(b)]);
  };

  this.rowUrl = function (b) {
    var ss = spreadsheet();
    return ss.getUrl() + "#gid=" + sheet(SHEETS.bookings).getSheetId() + "&range=A" + (b.row || 2);
  };

  this.openMap = function (fromKey, toKey) {
    var values = sheet(SHEETS.availability).getDataRange().getValues();
    var header = values[0];
    var map = {};
    for (var r = 1; r < values.length; r++) {
      var key = toDateKey(values[r][0]);
      if (!key || key < fromKey || key > toKey) continue;
      var set = {};
      for (var c = 2; c < header.length; c++) {
        var m = hmToMinute(header[c] instanceof Date ? formatTime(header[c]) : header[c]);
        if (!isNaN(m) && values[r][c] === true) set[m] = true;
      }
      map[key] = set;
    }
    return map;
  };

  this.blocked = function (from, to) {
    var values = sheet(SHEETS.blocked).getDataRange().getValues().slice(1);
    var out = [];
    values.forEach(function (r) {
      var s = r[0] instanceof Date ? r[0].getTime() : NaN;
      var e = r[1] instanceof Date ? r[1].getTime() : NaN;
      if (!isNaN(s) && !isNaN(e) && e > s && s < to && e > from) out.push({ start: s, end: e });
    });
    return out;
  };

  this.calendarConfigured = function () {
    return Boolean(props().getProperty("CALENDAR_ID"));
  };

  function calendar() {
    var id = props().getProperty("CALENDAR_ID");
    return id ? CalendarApp.getCalendarById(id) : null;
  }

  /** Occupations Google Agenda (hors événements créés par ce script). En cas de panne : checked=false, sans bloquer le site. */
  this.busy = function (from, to, useCache) {
    var key = "busy:" + from + ":" + to;
    var sc = CacheService.getScriptCache();
    if (useCache) {
      var hit = sc.get(key);
      if (hit) return { intervals: JSON.parse(hit), checked: true };
    }
    try {
      var cals = [];
      var cal = calendar();
      if (cal) cals.push(cal);
      if (self.settings().useMainCalendar) cals.push(CalendarApp.getDefaultCalendar());
      var out = [];
      cals.forEach(function (c) {
        c.getEvents(new Date(from), new Date(to)).forEach(function (ev) {
          if (ev.getTag("slcRef")) return;
          try {
            if (ev.getTransparency && String(ev.getTransparency()) === String(CalendarApp.EventTransparency.TRANSPARENT)) return;
          } catch (e) {}
          out.push({ start: ev.getStartTime().getTime(), end: ev.getEndTime().getTime() });
        });
      });
      sc.put(key, JSON.stringify(out), 60);
      return { intervals: out, checked: true };
    } catch (err) {
      self.log("Agenda", "", "", "Échec lecture", String(err && err.message ? err.message : err));
      return { intervals: [], checked: false };
    }
  };

  this.syncEvent = function (b) {
    var cal = calendar();
    if (!cal) return;
    try {
      var ev = b.eventId ? cal.getEventById(b.eventId) : null;
      var terminal = ["DECLINED", "CANCELLED", "EXPIRED"].indexOf(b.statusCode) >= 0;
      if (terminal) {
        if (ev) ev.deleteEvent();
      } else {
        var confirmed = b.statusCode === "CONFIRMED" || b.statusCode === "COMPLETED";
        var prefix = b.statusCode === "PENDING" ? "⏳ Demande — " : b.statusCode === "RESCHEDULE_PROPOSED" ? "↺ Proposition — " : "✦ ";
        var title = prefix + b.firstName + " " + b.lastName + " (" + formatDuration(Math.round((new Date(b.endIso) - new Date(b.startIso)) / 60000), "fr") + ")";
        var desc = [b.ref, "Statut : " + STATUS[b.statusCode], b.email, b.placement ? "Zone : " + b.placement : "", b.size ? "Taille : " + b.size : "", "", b.project].join("\n");
        if (!ev) {
          ev = cal.createEvent(title, new Date(b.startIso), new Date(b.endIso), { description: desc });
          ev.setTag("slcRef", b.ref);
        } else {
          ev.setTime(new Date(b.startIso), new Date(b.endIso));
          ev.setTitle(title);
          ev.setDescription(desc);
        }
        ev.setColor(confirmed ? CalendarApp.EventColor.ORANGE : CalendarApp.EventColor.GRAY);
        b.eventId = ev.getId();
      }
      b.calendarState = "";
      if (b.row) self.save(b);
    } catch (err) {
      b.calendarState = "à resynchroniser";
      if (b.row) self.save(b);
      self.log("Agenda", b.ref, "", "Échec", String(err && err.message ? err.message : err));
    }
  };

  this.saveFiles = function (b, files) {
    var folder = DriveApp.getFolderById(props().getProperty("FOLDER_ID"));
    var links = [];
    var ids = [];
    files.forEach(function (f, i) {
      var ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      var blob = Utilities.newBlob(Utilities.base64Decode(String(f.data)), f.type, b.ref + "-reference-" + (i + 1) + "." + ext);
      var file = folder.createFile(blob);
      links.push(file.getUrl());
      ids.push(file.getId());
    });
    return { links: links, ids: ids };
  };

  this.deleteFiles = function (ids) {
    ids.forEach(function (id) {
      try {
        DriveApp.getFileById(id).setTrashed(true);
      } catch (e) {}
    });
  };

  /** Envoie un e-mail ; en cas d'échec, il est noté dans le Journal et renvoyé automatiquement plus tard. */
  this.sendMail = function (m, ref, kind) {
    if (!m.to) return false;
    try {
      deliver(m);
      self.log(kind, ref, m.to, "Envoyé", m.subject);
      return true;
    } catch (err) {
      self.log(kind, ref, m.to, "Échec", String(err && err.message ? err.message : err), JSON.stringify(m));
      return false;
    }
  };

  function deliver(m) {
    var options = { to: m.to, subject: m.subject, htmlBody: m.html, body: m.text, name: BRAND };
    if (m.replyTo) options.replyTo = m.replyTo;
    if (m.attachments) {
      options.attachments = m.attachments.map(function (a) {
        return Utilities.newBlob(a.content, a.type, a.name);
      });
    }
    MailApp.sendEmail(options);
  }

  this.retryMails = function () {
    var sh = sheet(SHEETS.journal);
    var values = sh.getDataRange().getValues();
    var n = 0;
    for (var r = 1; r < values.length; r++) {
      if (values[r][5] !== "Échec" || !values[r][7]) continue;
      var tries = Number(values[r][8]) || 0;
      if (tries >= 5) continue;
      try {
        deliver(JSON.parse(values[r][7]));
        sh.getRange(r + 1, 6, 1, 4).setValues([["Envoyé (relance)", values[r][6], "", tries + 1]]);
        n++;
      } catch (err) {
        sh.getRange(r + 1, 9).setValue(tries + 1);
      }
    }
    return n;
  };

  this.log = function (kind, ref, to, result, detail, payload) {
    try {
      sheet(SHEETS.journal).appendRow([new Date(), kind || "", ref || "", to || "", String(detail || "").slice(0, 300), result, "", payload || "", 0]);
    } catch (e) {}
  };

  this.addMessage = function (m, now) {
    sheet(SHEETS.messages).appendRow([new Date(now), m.firstName, m.lastName, m.email, m.subject, m.message, m.locale.toUpperCase(), false]);
  };

  this.purgeMessages = function (cut) {
    var sh = sheet(SHEETS.messages);
    var values = sh.getDataRange().getValues();
    var n = 0;
    for (var r = values.length - 1; r >= 1; r--) {
      if (values[r][0] instanceof Date && values[r][0].getTime() < cut) {
        sh.deleteRow(r + 1);
        n++;
      }
    }
    return n;
  };

  this.extendAvailability = function (now) {
    ensureAvailabilityRows(sheet(SHEETS.availability), now, 180);
  };

  this.rateLimit = function (key, max, seconds) {
    var sc = CacheService.getScriptCache();
    var k = "rl:" + self.hash(key).slice(0, 40);
    var n = Number(sc.get(k) || 0) + 1;
    sc.put(k, String(n), seconds);
    return n <= max;
  };

  this.newToken = function () {
    return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  };

  this.hash = function (s) {
    var secret = props().getProperty("SECRET") || "";
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, secret + "|" + s, Utilities.Charset.UTF_8);
    return bytes.map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    }).join("");
  };
}

/* ═════════════════════════════ API web (utilisée par le site) ═════════════════════════════ */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle(fn) {
  try {
    return json(fn());
  } catch (err) {
    if (err instanceof Fail) return json({ ok: false, code: err.code });
    console.error(err);
    return json({ ok: false, code: "ERROR" });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  return handle(function () {
    var store = new SheetStore();
    if (p.action === "availability") return apiAvailability(store, p, Date.now());
    if (p.action === "proposal") return apiProposal(store, p, Date.now());
    return { ok: true, service: BRAND, status: "en ligne" };
  });
}

function doPost(e) {
  return handle(function () {
    var body = {};
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (err) {
      return { ok: false, code: "INVALID" };
    }
    var store = new SheetStore();
    if (body.action === "book") return apiBook(store, body, Date.now());
    if (body.action === "contact") return apiContact(store, body, Date.now());
    if (body.action === "respond") return apiRespond(store, body, Date.now());
    return { ok: false, code: "INVALID" };
  });
}

/* ═════════════════════════════ Administration dans le tableur ═════════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("✦ SOFTLINEBY.CLA")
    .addItem("1. Installer / réparer", "installer")
    .addSeparator()
    .addItem("Ouvrir toute la plage (11:00–20:00) pour les jours sélectionnés", "openSelectedDays")
    .addItem("Fermer les jours sélectionnés", "closeSelectedDays")
    .addSeparator()
    .addItem("Tester l'envoi d'un e-mail", "testEmail")
    .addItem("Lancer la maintenance maintenant", "runMaintenance")
    .addToUi();
}

/** Installation (à lancer une fois) : crée les onglets, l'agenda, le dossier Drive privé et les déclencheurs. */
function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = props();
  p.setProperty("SPREADSHEET_ID", ss.getId());
  if (!p.getProperty("SECRET")) p.setProperty("SECRET", (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ""));
  ss.setSpreadsheetTimeZone(TZ);

  // Réservations
  var b = ss.getSheetByName(SHEETS.bookings) || ss.insertSheet(SHEETS.bookings, 0);
  b.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(function (c) { return c[1]; })]).setFontWeight("bold").setBackground("#442913").setFontColor("#FBF8F3").setWrap(true);
  b.setFrozenRows(1);
  b.setFrozenColumns(1);
  COLUMNS.forEach(function (c, i) {
    b.setColumnWidth(i + 1, c[2]);
    if (c[3]) b.hideColumns(i + 1);
  });
  if (b.getMaxRows() < 501) b.insertRowsAfter(b.getMaxRows(), 501 - b.getMaxRows());
  var rows = b.getMaxRows() - 1;
  // Colonnes écrites par le script : format texte, pour que Google Sheets ne convertisse rien (dates ISO, heures…)
  ["ref", "createdAt", "date", "start", "end", "duration", "startIso", "endIso", "estimatedMinutes", "tokenHash", "requestedIso", "fileIds", "statusCode", "holdIso", "calendarState"].forEach(function (k) {
    b.getRange(2, COL[k], rows, 1).setNumberFormat("@");
  });
  b.getRange(2, COL.decision, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(DECISIONS).map(function (k) { return DECISIONS[k]; }), true).setAllowInvalid(false).build()).setBackground("#F3EAE2");
  b.getRange(2, COL.finalHours, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["1", "2", "3", "4", "5", "6", "7", "8", "9"], true).build()).setBackground("#F3EAE2");
  b.getRange(2, COL.newDate, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build()).setNumberFormat("dd/mm/yyyy").setBackground("#F3EAE2");
  b.getRange(2, COL.newTime, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(slotStarts().map(hm), true).build()).setNumberFormat("@").setBackground("#F3EAE2");
  b.getRange(2, COL.clientMessage, rows, 1).setBackground("#F3EAE2");
  b.getRange(2, 1, rows, COLUMNS.length).setVerticalAlignment("top");
  b.getRange(2, COL.history, rows, 1).setWrap(true);
  var statusRange = b.getRange(2, COL.status, rows, 1);
  var rules = [
    ["En attente", "#E2D1C2", "#442913"],
    ["Proposition envoyée", "#D4BBAC", "#442913"],
    ["Confirmé", "#5C3422", "#FBF8F3"],
    ["Terminé", "#442913", "#E2D1C2"],
    ["Refusé", "#FFFFFF", "#98755B"],
    ["Annulé", "#FFFFFF", "#98755B"],
    ["Expiré", "#FFFFFF", "#98755B"],
  ].map(function (r) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(r[0]).setBackground(r[1]).setFontColor(r[2]).setRanges([statusRange]).build();
  });
  b.setConditionalFormatRules(rules);

  // Disponibilités : une ligne par jour, une case par heure
  var a = ss.getSheetByName(SHEETS.availability) || ss.insertSheet(SHEETS.availability, 1);
  var head = ["Date", "Jour"].concat(slotStarts().map(hm));
  a.getRange(1, 1, 1, head.length).setNumberFormat("@").setValues([head]).setFontWeight("bold").setBackground("#442913").setFontColor("#FBF8F3").setHorizontalAlignment("center");
  a.setFrozenRows(1);
  a.setFrozenColumns(2);
  a.setColumnWidth(1, 100);
  a.setColumnWidth(2, 90);
  for (var c = 3; c <= head.length; c++) a.setColumnWidth(c, 56);
  ensureAvailabilityRows(a, Date.now(), 180);

  // Indisponibilités
  var x = ss.getSheetByName(SHEETS.blocked) || ss.insertSheet(SHEETS.blocked, 2);
  x.getRange(1, 1, 1, 3).setValues([["Début (date et heure)", "Fin (date et heure)", "Motif (privé)"]]).setFontWeight("bold").setBackground("#442913").setFontColor("#FBF8F3");
  x.getRange(2, 1, 300, 2).setNumberFormat("dd/mm/yyyy hh:mm").setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  x.setColumnWidths(1, 2, 170);
  x.setColumnWidth(3, 260);
  x.setFrozenRows(1);

  // Messages
  var m = ss.getSheetByName(SHEETS.messages) || ss.insertSheet(SHEETS.messages, 3);
  m.getRange(1, 1, 1, 8).setValues([["Date", "Prénom", "Nom", "E-mail", "Sujet", "Message", "Langue", "Traité"]]).setFontWeight("bold").setBackground("#442913").setFontColor("#FBF8F3");
  m.setFrozenRows(1);
  m.setColumnWidth(6, 420);
  m.getRange(2, 8, 500, 1).insertCheckboxes();

  // Paramètres
  var s = ss.getSheetByName(SHEETS.settings) || ss.insertSheet(SHEETS.settings, 4);
  var existing = {};
  s.getDataRange().getValues().forEach(function (r) {
    if (r[2]) existing[r[2]] = r[1];
  });
  var me = Session.getEffectiveUser().getEmail();
  s.getRange(1, 1, 1, 3).setValues([["Réglage", "Valeur (modifiable)", "clé"]]).setFontWeight("bold").setBackground("#442913").setFontColor("#FBF8F3");
  s.getRange(2, 1, SETTINGS.length, 3).setValues(
    SETTINGS.map(function (d) {
      var v = existing[d[0]];
      return [d[1], v === undefined || v === "" ? (d[0] === "notifyEmail" ? me : d[2]) : v, d[0]];
    }),
  );
  s.setColumnWidth(1, 430);
  s.setColumnWidth(2, 360);
  s.hideColumns(3);
  s.setFrozenRows(1);
  // Calendrier entièrement ouvert : l'onglet Disponibilités ne sert pas, il est masqué (réaffiché si le réglage passe à « non »)
  var allOpen = existing.allOpen === undefined || existing.allOpen === "" ? true : yes(existing.allOpen);
  if (allOpen) a.hideSheet();
  else a.showSheet();

  // Journal
  var j = ss.getSheetByName(SHEETS.journal) || ss.insertSheet(SHEETS.journal);
  j.getRange(1, 1, 1, 9).setValues([["Date", "Type", "Référence", "Destinataire", "Objet / détail", "Résultat", "", "données (renvoi)", "essais"]]).setFontWeight("bold").setBackground("#442913").setFontColor("#FBF8F3");
  j.setFrozenRows(1);
  j.hideColumns(7, 3);

  // Agenda dédié + dossier Drive privé
  if (!p.getProperty("CALENDAR_ID") || !CalendarApp.getCalendarById(p.getProperty("CALENDAR_ID"))) {
    var cal = CalendarApp.createCalendar(BRAND + " — Rendez-vous", { timeZone: TZ });
    p.setProperty("CALENDAR_ID", cal.getId());
  }
  if (!p.getProperty("FOLDER_ID")) {
    var folder = DriveApp.createFolder(BRAND + " — Images de référence (privé)");
    p.setProperty("FOLDER_ID", folder.getId());
  }

  // Déclencheurs
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (["onEditDecision", "hourlyMaintenance"].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onEditDecision").forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger("hourlyMaintenance").timeBased().everyHours(1).create();

  var old = ss.getSheetByName("Feuille 1") || ss.getSheetByName("Sheet1") || ss.getSheetByName("Blad1");
  if (old && ss.getSheets().length > 1 && old.getLastRow() === 0) ss.deleteSheet(old);

  SpreadsheetApp.getUi().alert(
    "✓ Installation terminée",
    "Onglets, agenda « " + BRAND + " — Rendez-vous », dossier Drive privé et automatismes sont prêts.\n\nÉtape suivante : Déployer → Nouveau déploiement → Application Web (voir le guide).",
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function ensureAvailabilityRows(sh, now, daysAhead) {
  var values = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  var have = {};
  var lastKey = null;
  values.forEach(function (r) {
    var k = toDateKey(r[0]);
    if (k) {
      have[k] = true;
      if (!lastKey || k > lastKey) lastKey = k;
    }
  });
  var today = localParts(new Date(now)).dateKey;
  var start = lastKey && lastKey >= today ? addDays(lastKey, 1) : today;
  var end = addDays(today, daysAhead);
  var rows = [];
  var names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  for (var k = start; k <= end; k = addDays(k, 1)) {
    if (have[k]) continue;
    var wd = new Date(k + "T12:00:00Z").getUTCDay();
    var row = [k.split("-").reverse().join("/"), names[wd]];
    for (var i = 0; i < slotStarts().length; i++) row.push(false);
    rows.push(row);
  }
  if (!rows.length) return;
  var first = sh.getLastRow() + 1;
  sh.getRange(first, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(first, 1, rows.length, 1).setNumberFormat("@");
  sh.getRange(first, 3, rows.length, slotStarts().length).insertCheckboxes();
  rows.forEach(function (r, i) {
    if (r[1] === "samedi" || r[1] === "dimanche") sh.getRange(first + i, 1, 1, 2).setFontColor("#98755B");
  });
}

/** Déclencheur installé : réagit au choix dans la colonne « ➜ Décision » (fonctionne aussi depuis l'appli mobile Sheets). */
function onEditDecision(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== SHEETS.bookings || e.range.getColumn() !== COL.decision || e.range.getRow() < 2 || e.range.getNumRows() !== 1) return;
  var value = String(e.value || e.range.getValue() || "");
  if (!value) return;
  var ref = String(sh.getRange(e.range.getRow(), COL.ref).getValue());
  var ss = sh.getParent();
  try {
    var r = decide(new SheetStore(), ref, value, Date.now());
    ss.toast("✓ " + ref + " : " + r.message + " — e-mail envoyé au client si nécessaire.", BRAND, 8);
  } catch (err) {
    var msg = err instanceof Fail ? err.message : String(err && err.message ? err.message : err);
    sh.getRange(e.range.getRow(), COL.decision).setValue("");
    var h = sh.getRange(e.range.getRow(), COL.history);
    h.setValue((h.getValue() ? h.getValue() + "\n" : "") + stamp(Date.now()) + " — ⚠ " + msg);
    ss.toast("⚠ " + msg, BRAND, 12);
  }
}

function hourlyMaintenance() {
  maintenance(new SheetStore(), Date.now());
}

function runMaintenance() {
  var r = maintenance(new SheetStore(), Date.now());
  SpreadsheetApp.getUi().alert("Maintenance effectuée : " + JSON.stringify(r));
}

function setSelectedDays(open) {
  if (new SheetStore().settings().allOpen) {
    SpreadsheetApp.getUi().alert(
      "Votre calendrier est entièrement ouvert : les clients choisissent librement leur créneau entre 11:00 et 20:00.\n\nPour bloquer un moment, ajoutez une ligne dans l'onglet « " + SHEETS.blocked + " » ou un événement dans votre Google Agenda.",
    );
    return;
  }
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEETS.availability) {
    SpreadsheetApp.getUi().alert("Sélectionnez d'abord des lignes (jours) dans l'onglet « " + SHEETS.availability + " ».");
    return;
  }
  var list = sh.getActiveRangeList().getRanges();
  list.forEach(function (rg) {
    var top = Math.max(2, rg.getRow());
    var n = rg.getLastRow() - top + 1;
    if (n > 0) sh.getRange(top, 3, n, slotStarts().length).setValue(open);
  });
}
function openSelectedDays() {
  setSelectedDays(true);
}
function closeSelectedDays() {
  setSelectedDays(false);
}

function testEmail() {
  var store = new SheetStore();
  var cfg = store.settings();
  var body = layout({ locale: "fr", siteUrl: cfg.siteUrl, eyebrow: "Test", title: "L'envoi d'e-mails fonctionne", preheader: "Test", paragraphs: ["Si vous lisez ceci, les e-mails automatiques de votre site fonctionnent."], footer: "Test depuis le tableur." });
  var ok = store.sendMail({ to: cfg.notifyEmail, subject: "Test — " + BRAND, html: body.html, text: body.text }, "", "Test");
  SpreadsheetApp.getUi().alert(ok ? "✓ E-mail de test envoyé à " + cfg.notifyEmail + " (vérifiez aussi les spams)." : "⚠ Échec de l'envoi : voir l'onglet Journal.");
}
