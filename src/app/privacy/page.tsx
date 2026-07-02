import { Header } from "@/components/header";

const sections = [
  {
    title: "1. Information we collect",
    body: "We collect account details such as name, email, phone number, and profile photo where provided. For bookings, we collect guest name, phone, optional email, dates, times, duration, guest count, seats, units, notes, booking token, payment status, and booking status.",
  },
  {
    title: "2. Location and listing information",
    body: "Listings may include country, city, area, approximate public location, exact private address, check-in instructions, images, amenities, prices, availability, blocked slots, host details, and verification status. Exact addresses and private instructions are only shown after confirmation.",
  },
  {
    title: "3. Payments and reserve fees",
    body: "We store payment references, amount, currency, payment status, customer phone, optional customer email, and provider responses needed to verify payment and resolve issues. We do not ask users to share card details directly with Beddn.",
  },
  {
    title: "4. SMS and notifications",
    body: "Beddn is SMS-first for MVP. We log recipient phone numbers, message content, provider, delivery status, booking id, errors, and timestamps so that users, hosts, and admins can track booking communication.",
  },
  {
    title: "5. Feedback, reviews, and demand searches",
    body: "We collect ratings, cleanliness, accuracy, safety, communication, comments, issue reports, would-book-again responses, and search demand such as area, category, results count, and optional location coordinates.",
  },
  {
    title: "6. How we use information",
    body: "We use information to create bookings, verify payments, notify hosts and guests, prevent double booking, unlock confirmed booking details, help admins resolve disputes, review verification badges, improve search coverage, and plan launch demand.",
  },
  {
    title: "7. Sharing information",
    body: "We share only what is needed for the booking flow. Hosts see paid booking requests and guest contact details needed to respond. Guests see host contact and exact location only after confirmation. Admins may access records for support, trust, safety, fraud, refunds, and payouts.",
  },
  {
    title: "8. Account, host setup, and verification",
    body: "Having an account does not automatically make someone a host; a host profile is still required. Listing and host verification badges may be reviewed by admins, and future checks may include identity, location, photo, or safety review.",
  },
  {
    title: "9. Data retention",
    body: "We keep booking, payment, SMS, feedback, and audit records as long as needed for operations, safety, legal compliance, fraud prevention, payouts, and dispute resolution. Users may request account assistance through support channels.",
  },
  {
    title: "10. Security",
    body: "We use access controls and role-based policies to limit data exposure. No system is perfect, so users should avoid sending unnecessary sensitive information in notes or messages.",
  },
  {
    title: "11. Future channels",
    body: "WhatsApp and email notifications may be added later. SMS remains the primary MVP channel because Beddn is designed for Africa-first booking reliability.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-cranberry">Beddn legal</p>
        <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
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
