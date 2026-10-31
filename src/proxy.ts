import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    // Contrôle rapide : la validation complète de la session se fait côté serveur (requireAdmin).
    const isPublicAdmin = pathname.startsWith("/admin/connexion");
    if (!isPublicAdmin && !request.cookies.get("slc_admin")) {
      return NextResponse.redirect(new URL("/admin/connexion", request.url));
    }
    return NextResponse.next();
  }
  return intl(request);
}

export const config = {
  // Tout sauf l'API, les fichiers internes Next.js et les fichiers statiques
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
