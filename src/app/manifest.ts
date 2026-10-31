import type { MetadataRoute } from "next";
import { asset } from "@/lib/config";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOFTLINEBY.CLA",
    short_name: "softlineby.cla",
    description: "Tatouage fine line — portfolio et réservation.",
    start_url: asset("/fr/"),
    display: "standalone",
    background_color: "#FBF8F3",
    theme_color: "#FBF8F3",
    icons: [
      { src: asset("/brand/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/brand/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
