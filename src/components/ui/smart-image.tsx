import Image, { type ImageProps } from "next/image";

const OPTIMIZED_HOSTS = new Set(["res.cloudinary.com", "images.unsplash.com", "images.pexels.com"]);

/** next/image that only optimizes whitelisted hosts and renders other HTTPS URLs as-is. */
export function SmartImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  let unoptimized = true;
  try {
    unoptimized = !OPTIMIZED_HOSTS.has(new URL(src).hostname);
  } catch {
    unoptimized = true;
  }
  return <Image src={src} alt={alt} unoptimized={unoptimized} {...props} />;
}

export function ImagePreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className ?? "aspect-video w-full"}`}>
      <SmartImage src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
    </div>
  );
}
