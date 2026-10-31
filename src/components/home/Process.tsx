import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "../site/Reveal";
import { ArrowRight } from "../ui/icons";

export async function Process() {
  const t = await getTranslations("home");
  const steps = t.raw("steps") as Array<{ title: string; text: string }>;
  return (
    <section className="container-site py-24 md:py-36" aria-labelledby="process-title">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-span-4 lg:self-start">
          <p className="eyebrow">{t("processLabel")}</p>
          <h2 id="process-title" className="display-l mt-6">
            {t("processTitle")}
          </h2>
        </Reveal>
        <ol className="relative grid gap-0 lg:col-span-8">
          {steps.map((s, i) => (
            <Reveal
              as="li"
              key={s.title}
              delay={i * 90}
              className="group grid grid-cols-[4.5rem_1fr] items-baseline gap-4 border-t border-line py-7 last:border-b md:grid-cols-[6rem_1fr_1.3fr] md:gap-8"
            >
              <span className="font-[family-name:var(--font-display)] text-4xl leading-none text-light-brown italic md:text-5xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight md:text-[1.75rem]">{s.title}</h3>
              <p className="col-start-2 text-fg-muted md:col-start-3">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
      <Reveal className="mt-12 flex flex-col gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-7 md:flex-row md:items-center md:justify-between md:p-9 lg:ml-[33.33%]">
        <p className="max-w-xl font-semibold text-fg">{t("processNote")}</p>
        <Link href="/booking" className="btn btn-primary shrink-0">
          {t("ctaBook")} <ArrowRight className="btn-icon" size={16} />
        </Link>
      </Reveal>
    </section>
  );
}
