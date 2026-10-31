import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Site 100 % statique pour GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH = "/Softlinebycla-tatouages" sur GitHub Pages (renseigné automatiquement par le workflow),
 * vide en local ou avec un nom de domaine personnalisé.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [480, 828, 1200, 1800],
    imageSizes: [96, 256],
  },
  experimental: { globalNotFound: true },
};

export default withNextIntl(nextConfig);
