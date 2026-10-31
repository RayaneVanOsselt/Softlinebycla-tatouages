import { desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { MessageItem } from "@/components/admin/MessageItem";
import { getDb } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { formatDateLong, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ archives?: string }> }) {
  const { archives } = await searchParams;
  const db = await getDb();
  const rows = await db
    .select()
    .from(contactMessages)
    .where(archives ? eq(contactMessages.status, "ARCHIVED") : ne(contactMessages.status, "ARCHIVED"))
    .orderBy(desc(contactMessages.createdAt))
    .limit(200);
  return (
    <>
      <AdminHeading
        title="Messages"
        text="Messages reçus via le formulaire de contact. Chaque message vous est aussi transmis par e-mail."
        actions={
          <Link href={archives ? "/admin/messages" : "/admin/messages?archives=1"} className="text-sm underline underline-offset-4">
            {archives ? "Voir les messages actifs" : "Voir les archives"}
          </Link>
        }
      />
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">Aucun message.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <MessageItem key={m.id} m={{ ...m, createdAt: `${formatDateLong(m.createdAt, "fr")} ${formatTime(m.createdAt, "fr")}` }} />
          ))}
        </ul>
      )}
    </>
  );
}
