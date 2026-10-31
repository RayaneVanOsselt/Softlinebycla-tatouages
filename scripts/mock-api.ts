/**
 * Serveur de DÉMONSTRATION local : exécute apps-script/Code.gs avec des données en mémoire
 * pour essayer le site sans compte Google. Aucun e-mail n'est envoyé : ils s'affichent ici.
 *
 * Usage : npm run mock-api   puis, dans .env.local : NEXT_PUBLIC_BOOKING_API_URL=http://localhost:8787/exec
 */
import http from "node:http";
import { loadGas, MemoryStore } from "../tests/support/gas";

const gas = loadGas();
const store = new MemoryStore();
store.cfg.siteUrl = "http://localhost:3000";

// Démo : mardis, jeudis et samedis ouverts sur 3 mois
const today = new Date();
for (let i = 1; i < 92; i++) {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
  if ([2, 4, 6].includes(d.getUTCDay())) store.openDay(d.toISOString().slice(0, 10));
}

const sentBefore = { n: 0 };
function printMails() {
  for (const m of store.sent.slice(sentBefore.n)) {
    console.log(`\n✉︎  [DÉMO — non envoyé] À : ${m.to}\n   Objet : ${m.subject}\n${m.text.split("\n").map((l) => `   ${l}`).join("\n")}`);
  }
  sentBefore.n = store.sent.length;
}

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const url = new URL(req.url ?? "/", "http://localhost");
    const params = Object.fromEntries(url.searchParams);
    const reply = (fn: () => unknown) => {
      try {
        res.end(JSON.stringify(fn()));
      } catch (err) {
        const code = (err as { code?: string }).code;
        res.end(JSON.stringify({ ok: false, code: code ?? "ERROR", message: (err as Error).message }));
      }
      printMails();
    };
    if (req.method === "GET") {
      return reply(() => (params.action === "availability" ? gas.apiAvailability(store, params, Date.now()) : params.action === "proposal" ? gas.apiProposal(store, params, Date.now()) : { ok: true }));
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () =>
      reply(() => {
        const p = JSON.parse(body || "{}");
        if (p.action === "book") return gas.apiBook(store, p, Date.now());
        if (p.action === "contact") return gas.apiContact(store, p, Date.now());
        if (p.action === "respond") return gas.apiRespond(store, p, Date.now());
        // Démo uniquement : simuler une décision de l'artiste (dans la vraie version : colonne « Décision » du tableur)
        if (p.action === "demo-decide") return gas.decide(store, p.ref, p.decision, Date.now());
        return { ok: false, code: "INVALID" };
      }),
    );
  })
  .listen(8787, () => console.log("API de démonstration : http://localhost:8787/exec (mardis, jeudis et samedis ouverts)"));
