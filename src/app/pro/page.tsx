import { Header } from "@/components/header";
import { HostMembershipContent } from "@/components/host/host-membership-content";

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
