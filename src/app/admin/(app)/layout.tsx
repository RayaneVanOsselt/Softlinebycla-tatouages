import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCounts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const counts = await getCounts();
  return (
    <div className="lg:flex">
      <AdminNav email={session.email} counts={counts} />
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 md:px-8 lg:pt-10 lg:pb-16">{children}</main>
    </div>
  );
}
