import { getCurrentUser } from "@/lib/auth/guards";
import { isCloudinaryConfigured, MAX_UPLOAD_BYTES, sniffImageType, uploadImage } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Authenticated image upload: validates size + real file type (magic bytes), stores in the user's folder. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isCloudinaryConfigured()) return Response.json({ error: "upload_unavailable" }, { status: 503 });
  if (!rateLimit(`upload:${user.id}`, 30, 60 * 60_000).ok) return Response.json({ error: "rate_limited" }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "file_too_large" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!sniffImageType(buffer)) return Response.json({ error: "invalid_file_type" }, { status: 415 });

  try {
    const url = await uploadImage(buffer, user.id);
    return Response.json({ url });
  } catch (error) {
    console.error("[upload] failed", error);
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }
}
