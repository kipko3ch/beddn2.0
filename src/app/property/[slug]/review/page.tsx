import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { createAdminClient } from "@/lib/supabase/admin";
import { PropertyReviewClient } from "./property-review-client";

export const dynamic = "force-dynamic";

export default async function PropertyReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("listings")
    .select(`
      id,
      slug,
      title,
      name,
      city,
      area,
      country,
      property_type,
      is_verified,
      listing_images(id, url, position),
      host:hosts(name, avatar_url, is_verified)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!listing) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#faf8f7] text-[#241f21]">
      <Header />
      <PropertyReviewClient listing={listing as any} />
    </div>
  );
}
