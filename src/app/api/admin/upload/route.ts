import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdminSession } from "@/lib/auth/session";
import { blobEnabled } from "@/lib/config";
import { json } from "@/lib/http";
import { logger } from "@/lib/logger";
import { isSameOrigin } from "@/lib/security/request";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm", "video/quicktime"];

/**
 * Upload des médias du portfolio.
 * - Production : envoi direct navigateur → Vercel Blob (jeton délivré ici après vérification de la session admin).
 * - Développement sans Blob : enregistrement local dans public/uploads.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return json({ code: "UNAUTHORIZED" }, 401);

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    if (!isSameOrigin(req.headers)) return json({ code: "FORBIDDEN" }, 403);
    if (blobEnabled() || process.env.VERCEL) return json({ code: "USE_BLOB", message: "Utilisez l'envoi direct Vercel Blob." }, 400);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !ALLOWED.includes(file.type)) return json({ code: "INVALID_TYPE" }, 400);
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }[file.type];
    const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return json({ url: `/uploads/${name}`, pathname: null });
  }

  if (!blobEnabled()) return json({ code: "BLOB_NOT_CONFIGURED", message: "Vercel Blob n'est pas configuré (BLOB_READ_WRITE_TOKEN)." }, 400);
  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
      onUploadCompleted: async ({ blob }) => {
        logger.info("media.uploaded", { pathname: blob.pathname });
      },
    });
    return json(result);
  } catch (error) {
    logger.error("media.upload_failed", { error });
    return json({ code: "ERROR", message: (error as Error).message }, 400);
  }
}
