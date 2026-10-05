import type { Metadata } from "next";
import { MarketplaceView } from "@/components/marketplace-view";
import { notFound } from "next/navigation";

type CategoryPageProps = {
  params: Promise<{ type: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const type = (await params).type;

  if (type === "hourly") {
    return {
      title: "Hourly Stays & Day Rooms",
      description:
        "Book hourly stays, photo studios, conference halls, and event spaces across Kenya and Tanzania. Pay only for the hours you need on Beddn.",
      alternates: {
        canonical: "https://beddn.com/category/hourly",
      },
      openGraph: {
        title: "Hourly Stays & Day Rooms | Beddn",
        description:
          "Book hourly stays, photo studios, conference halls, and event spaces across Kenya and Tanzania. Pay only for the hours you need on Beddn.",
        url: "https://beddn.com/category/hourly",
      },
    };
  }

  if (type === "overnight") {
    return {
      title: "Vacation Rentals & Furnished Homes",
      description:
        "Discover furnished apartments, private villas, beachfront cottages, and holiday stays across Kenya and Tanzania. Book on Beddn.",
      alternates: {
        canonical: "https://beddn.com/category/overnight",
      },
      openGraph: {
        title: "Vacation Rentals & Furnished Homes | Beddn",
        description:
          "Discover furnished apartments, private villas, beachfront cottages, and holiday stays across Kenya and Tanzania. Book on Beddn.",
        url: "https://beddn.com/category/overnight",
      },
    };
  }

  if (type === "experience") {
    return {
      title: "Local Experiences & Guided Activities",
      description:
        "Explore unique safari day trips, city walking tours, culinary workshops, and outdoor adventures with verified local hosts in Kenya and Tanzania.",
      alternates: {
        canonical: "https://beddn.com/category/experience",
      },
      openGraph: {
        title: "Local Experiences & Guided Activities | Beddn",
        description:
          "Explore unique safari day trips, city walking tours, culinary workshops, and outdoor adventures with verified local hosts in Kenya and Tanzania.",
        url: "https://beddn.com/category/experience",
      },
    };
  }

  return {
    title: "Category",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const type = (await params).type;

  if (!["hourly", "overnight", "experience"].includes(type)) {
    notFound();
  }

  return <MarketplaceView initialCategory={type as any} />;
}
