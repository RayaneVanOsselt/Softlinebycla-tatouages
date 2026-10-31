/**
 * Envoi d'e-mails transactionnels via SMTP (Nodemailer).
 * Configuration recommandée, 100 % gratuite : Gmail + « mot de passe d'application »
 * (smtp.gmail.com:465, jusqu'à ~500 e-mails/jour). Fonctionne aussi avec Brevo, Infomaniak, OVH…
 */
import nodemailer, { type Transporter } from "nodemailer";
import { smtpConfig } from "../config";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("SMTP non configuré (SMTP_USER / SMTP_PASSWORD manquants)");
    this.name = "EmailNotConfiguredError";
  }
}

type SendFn = (email: OutgoingEmail) => Promise<{ messageId: string }>;

const g = globalThis as unknown as { __slcTransport?: Transporter; __slcSendOverride?: SendFn };

export function emailConfigured() {
  return Boolean(g.__slcSendOverride || smtpConfig());
}

/** Tests : remplace l'envoi réel. */
export function setEmailSenderForTesting(fn: SendFn | undefined) {
  g.__slcSendOverride = fn;
}

export async function sendEmail(email: OutgoingEmail): Promise<{ messageId: string }> {
  if (g.__slcSendOverride) return g.__slcSendOverride(email);
  const cfg = smtpConfig();
  if (!cfg) throw new EmailNotConfiguredError();
  g.__slcTransport ??= nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  const info = await g.__slcTransport.sendMail({
    from: { name: cfg.fromName, address: cfg.fromAddress },
    to: email.to,
    replyTo: email.replyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
  return { messageId: info.messageId };
}

/** Vérifie la connexion SMTP (bouton « Tester » de l'administration). */
export async function verifySmtp() {
  const cfg = smtpConfig();
  if (!cfg) throw new EmailNotConfiguredError();
  const t = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth: { user: cfg.user, pass: cfg.pass } });
  await t.verify();
  return true;
}
