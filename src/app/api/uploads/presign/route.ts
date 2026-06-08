import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import {
  R2_BUCKET,
  getR2Client,
  isR2Configured,
  publicUrlForKey,
} from "@/lib/r2";

const ALLOWED_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
]);

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Image storage is not configured." },
      { status: 503 }
    );
  }

  // Only signed-in users may request an upload URL.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const contentType = body.contentType ?? "";
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported image type." },
      { status: 400 }
    );
  }

  const ext = EXT[contentType];
  const key = `listings/${user.id}/${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}.${ext}`;

  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 } // url valid for 60s, just enough to upload
  );

  return NextResponse.json({
    uploadUrl,
    publicUrl: publicUrlForKey(key),
    key,
  });
}
