import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { bookingEvents, bookings, contactMessages } from "@/lib/db/schema";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Export RGPD (droit d'accès / portabilité) de toutes les données liées à une adresse e-mail. */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return json({ code: "UNAUTHORIZED" }, 401);
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return json({ code: "INVALID" }, 400);
  const db = await getDb();
  const list = await db.select().from(bookings).where(eq(bookings.email, email));
  const history = await Promise.all(list.map((b) => db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, b.id))));
  const messages = await db.select().from(contactMessages).where(eq(contactMessages.email, email));
  const body = {
    exportedAt: new Date().toISOString(),
    email,
    bookings: list.map((b, i) => ({ ...b, responseTokenHash: undefined, history: history[i] })),
    contactMessages: messages,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="export-${email.replace(/[^a-z0-9]+/gi, "_")}.json"`,
      "cache-control": "no-store",
    },
  });
}
