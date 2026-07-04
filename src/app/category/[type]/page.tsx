import { MarketplaceView } from "@/components/marketplace-view";
import { notFound } from "next/navigation";

export default async function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const type = (await params).type;

  if (!["hourly", "overnight", "experience"].includes(type)) {
    notFound();
  }

  return <MarketplaceView initialCategory={type as any} />;
}
