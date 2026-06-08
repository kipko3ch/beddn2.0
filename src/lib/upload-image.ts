import imageCompression from "browser-image-compression";

/**
 * Compress an image in the browser (web worker — user's device, not our server)
 * down to ~250KB, convert to WebP, then upload straight to Cloudflare R2 via a
 * short-lived presigned URL. The bytes never pass through our VPS.
 *
 * Returns the public URL of the stored image.
 */
export async function uploadListingImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" is not an image.`);
  }

  // Visually near-lossless, capped at 250KB. The library binary-searches
  // quality/scale to meet maxSizeMB while keeping resolution as high as it can.
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.25, // 250 KB ceiling
    maxWidthOrHeight: 2560, // only downscale very large photos
    initialQuality: 0.85,
    useWebWorker: true,
    fileType: "image/webp",
  });

  const contentType = "image/webp";

  // 1. Ask our server for a presigned PUT URL (tiny, auth-gated).
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
  });

  if (!presignRes.ok) {
    const { error } = await presignRes.json().catch(() => ({ error: "" }));
    throw new Error(error || "Could not start upload.");
  }

  const { uploadUrl, publicUrl } = (await presignRes.json()) as {
    uploadUrl: string;
    publicUrl: string;
  };

  // 2. Upload the compressed file directly to R2.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: compressed,
  });

  if (!putRes.ok) {
    throw new Error("Upload to storage failed.");
  }

  return publicUrl;
}
