import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/fr/reservation/reponse", "/nl/afspraak/antwoord", "/en/booking/response"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
