This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Admin-Created Listings & Host Claim Flow

This feature enables Beddn administrators to curate properties and onboard listings before hosts join, while providing a seamless, verified claim flow for property owners.

### 1. Admin Workflow: Creating Listings

1. In the Admin Console, go to **Marketplace > Listings** (`/admin/listings`) and click **Add listing** (or navigate to `/admin/listings/new`).
2. Fill out property information using the wizard. In the **"Who is hosting this place?"** step, choose one of two options:
   - **Existing user**: Search for a registered user by name or email. Assigning a user sets `ownership_state = 'managed_by_admin'`. The host immediately sees the property in their dashboard with a notice: *"Created for you by Beddn · You can take over editing anytime."*
   - **No host yet (Hosted by Beddn)**: Sets `ownership_state = 'unclaimed'`.
     - **Contact Phone** *(Required to publish)*: Public phone number with country code (e.g. `+254712345678` or `+255...`). Automatically normalized before saving.
     - **Contact Display Name** *(Optional)*: Who answers (defaults to *"Beddn"*).
     - **Private Owner Info** *(Admin-only, never public)*: `private_owner_name`, `private_owner_email`, and `private_notes`. The email is used to automatically flag matching host claims as a "Strong match".

### 2. Public Display & Guest Contact

- **Hosted by Beddn**: If `ownership_state === 'unclaimed'`, the property displays a dedicated "Hosted by Beddn" card with the Beddn logo.
- **Direct Guest Contact**: Guests contact the property via public **Call** (`tel:`) and **WhatsApp** (`https://wa.me/...`) buttons using the admin-entered phone number. Online checkout and instant reserve fees are blocked server-side and in the UI.
- **Privacy Assurance**: `private_owner_name`, `private_owner_email`, `private_notes`, and `created_by_admin_id` are strictly stripped from all public responses.

### 3. Host Claim Flow

- On unclaimed listings only, a low-emphasis 12–13px text link appears near the host card: *"Own this place? Claim listing"* (or *"Claim pending"* if the user has already submitted a claim).
- Clicking opens a claim modal:
  1. **Claim Details**: Relationship (`owner`, `manager`, `caretaker`), optional message, and account creation/login.
  2. **Email OTP Verification**: Claimant receives a 6-digit email OTP via ZeptoMail (10-minute expiry, SHA-256 hashed storage, max 5 attempts).
  3. If the verified email equals `private_owner_email` (case-insensitive), it is flagged as a **Strong Match**.
  4. Claimant can withdraw a pending claim at any time from the listing page.

### 4. Admin Claims Queue (`/admin/claims`)

- Filter claims by **Pending**, **Approved**, or **Rejected**.
- Each claim displays claimant name and email, role, note, email verification badge, and strong match indicator.
- **Approve Claim**: Transfers ownership (`ownership_state = 'owned'`, `owner_id = claimant`), clears Beddn support contact phone and name, marks claim approved, auto-rejects other pending claims on that listing, and emails the new host with a management link. Approval is protected against race conditions with row locking.
- **Reject Claim**: Requires a reason, emails the claimant explaining the decision, and keeps the listing unclaimed.

### 5. Running Tests

To run the automated test suite for this feature:
```bash
npx tsx scripts/test-admin-listings-claims.ts
```

