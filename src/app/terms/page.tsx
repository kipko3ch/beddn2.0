import { Header } from "@/components/header";

const sections = [
  {
    title: "1. What Beddn does",
    body: "Beddn helps guests discover and reserve stays, hourly spaces, and experiences. Guests may reserve without creating an account, but accounts are required for saved trips, host tools, and some review features.",
  },
  {
    title: "2. Reservations and host confirmation",
    body: "A reservation is not fully confirmed until the reserve fee is paid and the host accepts, unless the listing is set to auto-accept by an admin. Before confirmation, host phone numbers, exact addresses, and private check-in details remain hidden.",
  },
  {
    title: "3. Reserve fees, pricing, and negotiation",
    body: "Some listings use a reserve-fee model. The reserve fee holds the request while the host confirms availability. Guests may ask hosts for a better price for longer stays, group bookings, repeat visits, or local arrangements. Negotiation messages do not guarantee a discount unless the host agrees.",
  },
  {
    title: "4. Availability",
    body: "Hosts are responsible for keeping rooms, seats, session times, blocked dates, and availability accurate. Beddn rechecks availability before confirmation when possible. If availability changes after payment, the booking may be sent for admin review.",
  },
  {
    title: "5. Guest responsibilities",
    body: "Guests must provide accurate names, phone numbers, dates, guest counts, and notes. Guests must respect host rules, property rules, community rules, and local law. Guests should not share unlocked host contact or private check-in details publicly.",
  },
  {
    title: "6. Host responsibilities",
    body: "Hosts can create listings after setting up a host profile. Hosts must provide truthful listings, safe locations, working contact information, clear check-in instructions, current availability, and prompt responses to paid booking requests.",
  },
  {
    title: "7. Verification",
    body: "Verification controls badges, not basic listing creation. Beddn may add a Verified host or Verified listing badge after checks such as photos, address review, identity, safety, or physical inspection.",
  },
  {
    title: "8. Cancellations, rejections, refunds, and disputes",
    body: "If a host rejects a paid request, Beddn may assist with a refund or manual resolution. Refund timing may depend on payment providers and banks. Disputes, fraud reports, safety issues, no-response reports, and location mismatch reports may be reviewed by admins.",
  },
  {
    title: "9. Reviews and feedback",
    body: "Only completed bookings can create public reviews. Completed bookings may also submit private feedback using a booking token and phone verification. Beddn may use feedback to improve safety, trust, quality, and launch planning.",
  },
  {
    title: "10. Prohibited activity",
    body: "Users may not create fake listings, impersonate others, bypass Beddn to avoid safety or payment controls, submit false reviews, harass users, post illegal offers, or use Beddn for fraud or unsafe activity.",
  },
  {
    title: "11. Changes to service",
    body: "Beddn is an early-stage product. Features, fees, verification rules, payout rules, notification channels, and availability tools may change as the product improves.",
  },
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-[#800020]">Beddn legal</p>
        <h1 className="mt-2 text-3xl font-bold">Terms of Use</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: May 7, 2026</p>
        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
