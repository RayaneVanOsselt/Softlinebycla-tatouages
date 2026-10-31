import { AdminHeading } from "@/components/admin/AdminHeading";
import { BookingForm, ContactForm, ContentForm, LegalForm, PrivacyTools, SocialForm } from "@/components/admin/SettingsForms";
import { getSetting } from "@/lib/settings";
import fr from "../../../../../messages/fr.json";
import nl from "../../../../../messages/nl.json";
import en from "../../../../../messages/en.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres" };

const defaultsFor = (m: typeof fr) => ({
  heroTitle: `${m.home.heroTitle} / ${m.home.heroTitleAccent}`,
  heroText: m.home.heroText,
  manifesto: m.home.manifesto,
  aboutIntro: m.about.intro,
  aboutApproach: m.about.approach,
  aboutBody: m.about.universe,
  ctaTitle: m.home.ctaTitle,
  ctaText: m.home.ctaText,
});

export default async function SettingsPage() {
  const [contact, social, booking, content, legal] = await Promise.all([getSetting("contact"), getSetting("social"), getSetting("booking"), getSetting("content"), getSetting("legal")]);
  return (
    <>
      <AdminHeading title="Paramètres" text="Coordonnées, réseaux sociaux, règles de réservation, textes du site et informations légales." />
      <div className="space-y-6">
        <ContactForm initial={contact} />
        <BookingForm initial={booking} />
        <SocialForm initial={social} />
        <ContentForm initial={content} defaults={{ fr: defaultsFor(fr), nl: defaultsFor(nl), en: defaultsFor(en) }} />
        <LegalForm initial={legal} />
        <PrivacyTools />
      </div>
    </>
  );
}
