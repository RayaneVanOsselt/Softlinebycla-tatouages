import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Monogram } from "../site/Brand";
import { Reveal } from "../site/Reveal";
import { ArrowRight } from "../ui/icons";

export async function CtaBand({ title, text }: { title?: string; text?: string }) {
  const t = await getTranslations("home");
  return (
    <section className="relative overflow-hidden bg-surface-strong" aria-labelledby="cta-title">
      <Monogram className="pointer-events-none absolute top-1/2 right-[-4rem] h-[130%] w-auto -translate-y-1/2 opacity-[0.07] md:right-[6%]" />
      <div className="container-site relative py-28 md:py-40">
        <Reveal>
          <p className="eyebrow">{t("ctaLabel")}</p>
          <h2 id="cta-title" className="display-xl mt-7 max-w-5xl">
            {title ?? t("ctaTitle")}
          </h2>
        </Reveal>
        <Reveal delay={150} className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="lead max-w-lg">{text ?? t("ctaText")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/booking" className="btn btn-primary">
              {t("ctaBook")} <ArrowRight className="btn-icon" size={16} />
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              {t("ctaContact")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
