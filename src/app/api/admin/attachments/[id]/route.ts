import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { bookingAttachments } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Images de référence privées : servies uniquement à l'administratrice connectée. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const [file] = await db.select().from(bookingAttachments).where(eq(bookingAttachments.id, id)).limit(1);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.data.length),
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="${file.filename}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
