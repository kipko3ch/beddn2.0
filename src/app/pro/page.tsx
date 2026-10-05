import type { Metadata } from "next";
import { Header } from "@/components/header";
import { HostMembershipContent } from "@/components/host/host-membership-content";

export const metadata: Metadata = {
  title: "Beddn Pro | Host Membership & Growth Tools",
  description:
    "Grow your rental bookings with Beddn Pro. Access priority placement, search boosts, zero-commission perks, and advanced host tools in Kenya and Tanzania.",
  alternates: {
    canonical: "https://beddn.com/pro",
  },
  openGraph: {
    title: "Beddn Pro | Host Membership & Growth Tools",
    description:
      "Grow your rental bookings with Beddn Pro. Access priority placement, search boosts, zero-commission perks, and advanced host tools in Kenya and Tanzania.",
    url: "https://beddn.com/pro",
  },
};

export default function PublicProPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8f9] text-[#181113] pt-6 md:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HostMembershipContent backUrl="/" />
        </div>
      </main>
    </>
  );
}
