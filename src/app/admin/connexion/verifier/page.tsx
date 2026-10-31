import { verifyLoginAction } from "@/app/admin/actions";
import { FullLogo } from "@/components/site/Brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion", referrer: "no-referrer" };

/** Étape de confirmation (bouton) : les antivirus de messagerie qui « visitent » les liens ne consomment pas le jeton. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="grid min-h-svh place-items-center px-4">
      <form action={verifyLoginAction} className="w-full max-w-sm text-center">
        <FullLogo className="mx-auto h-auto w-28" />
        <h1 className="display-s mt-10">Confirmer la connexion</h1>
        <input type="hidden" name="token" value={token ?? ""} />
        <button type="submit" className="btn btn-primary mt-8 w-full">
          Me connecter
        </button>
      </form>
    </main>
  );
}
