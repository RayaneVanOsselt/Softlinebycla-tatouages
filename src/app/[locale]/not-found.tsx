import { getTranslations } from "next-intl/server";
import { Monogram } from "@/components/site/Brand";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <section className="container-site flex min-h-[80svh] flex-col items-center justify-center pt-[var(--header-h)] text-center">
      <Monogram className="h-28 w-auto opacity-60" />
      <p className="eyebrow mt-10">404</p>
      <h1 className="display-l mt-5">{t("title")}</h1>
      <p className="lead mt-6 max-w-md">{t("text")}</p>
      <Link href="/" className="btn btn-primary mt-10">
        {t("home")}
      </Link>
    </section>
  );
}
