import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Detects the real file type from magic bytes (never trust the client MIME type). */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

export async function uploadImage(buffer: Buffer, userId: string): Promise<string> {
  configure();
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `evento/${userId}`, resource_type: "image", overwrite: false },
      (error, res) => (error || !res ? reject(error ?? new Error("upload failed")) : resolve(res)),
    );
    stream.end(buffer);
  });
  return result.secure_url;
}

/**
 * Validates an image URL submitted by a user:
 * - unchanged values are accepted;
 * - with Cloudinary configured, only images uploaded by this user are accepted (ownership);
 * - otherwise only HTTPS URLs are accepted.
 */
export function isAllowedImageUrl(url: string, userId: string, previous?: string | null): boolean {
  if (previous && url === previous) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!isCloudinaryConfigured()) return true;
  const prefix = `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
  return (
    parsed.hostname === "res.cloudinary.com" &&
    parsed.pathname.startsWith(prefix) &&
    parsed.pathname.includes(`/evento/${userId}/`)
  );
}
