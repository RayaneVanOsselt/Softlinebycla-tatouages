import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { FullLogo } from "@/components/site/Brand";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (await getAdminSession()) redirect("/admin");
  const { erreur } = await searchParams;
  return (
    <main className="paper-grain grid min-h-svh place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <FullLogo className="mx-auto h-auto w-32" />
        <h1 className="display-s mt-10 text-center">Espace privé</h1>
        <p className="mt-2 mb-8 text-center text-sm text-fg-muted">Connexion sans mot de passe : un lien sécurisé vous est envoyé par e-mail.</p>
        <LoginForm linkError={erreur === "lien"} />
      </div>
    </main>
  );
}
