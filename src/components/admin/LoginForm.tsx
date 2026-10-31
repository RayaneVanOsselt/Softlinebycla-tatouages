"use client";

import { useActionState } from "react";
import { requestLoginAction } from "@/app/admin/actions";

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const [state, action, pending] = useActionState(requestLoginAction, null);
  return (
    <form action={action} className="space-y-5">
      {linkError && !state && (
        <p role="alert" className="rounded-xl border border-nut p-3 text-sm font-semibold text-nut">
          Ce lien de connexion est invalide ou a expiré. Demandez-en un nouveau.
        </p>
      )}
      <div>
        <label htmlFor="email" className="field-label">
          Adresse e-mail administrateur
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field-input" placeholder="vous@exemple.com" />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>
      {state && (
        <div role="status" className="rounded-xl bg-surface p-4 text-sm">
          {state.status === "sent" && <p>Si cette adresse est autorisée, un lien de connexion vient d’être envoyé. Il est valable 15 minutes.</p>}
          {state.status === "dev-link" && (
            <p>
              <strong>Mode développement</strong> (e-mail non configuré : rien n’a été envoyé). Lien de connexion :{" "}
              <a className="link-line break-all" href={state.link}>
                se connecter
              </a>
            </p>
          )}
          {state.status === "email-not-configured" && <p>L’envoi d’e-mails n’est pas encore configuré (SMTP_USER / SMTP_PASSWORD). Impossible d’envoyer le lien.</p>}
          {state.status === "invalid" && <p>Adresse e-mail invalide.</p>}
          {state.status === "rate-limited" && <p>Trop de tentatives. Réessayez dans quelques minutes.</p>}
          {state.status === "no-admin" && <p>Aucune adresse administrateur n’est configurée (variable ADMIN_EMAILS).</p>}
        </div>
      )}
    </form>
  );
}
