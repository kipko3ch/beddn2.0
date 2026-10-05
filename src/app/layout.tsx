import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CurrencyProvider } from "@/components/currency-provider";

const kualine = localFont({
  src: "../../gc-kualine-font/GC-Kualine-Demo-BF688b24f63a0c2.ttf",
  variable: "--font-kualine",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const tripSans = localFont({
  src: "../../public/fonts/trip-sans-variable.ttf",
  variable: "--font-trip-sans",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://beddn.com"),
  title: {
    default: "Beddn | Book Short Stays & BnBs in Kenya and Tanzania",
    template: "%s | Beddn",
  },
  description:
    "Find and book short stays, BnBs and furnished apartments across Kenya and Tanzania. Hosts, list your place on Beddn and start earning.",
  openGraph: {
    siteName: "Beddn",
    locale: "en_KE",
    type: "website",
    url: "https://beddn.com",
    title: "Beddn | Book Short Stays & BnBs in Kenya and Tanzania",
    description:
      "Find and book short stays, BnBs and furnished apartments across Kenya and Tanzania. Hosts, list your place on Beddn and start earning.",
    images: [
      {
        url: "/images/cat-all.png",
        width: 1200,
        height: 630,
        alt: "Beddn | Book Short Stays & BnBs in Kenya and Tanzania",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beddn | Book Short Stays & BnBs in Kenya and Tanzania",
    description:
      "Find and book short stays, BnBs and furnished apartments across Kenya and Tanzania. Hosts, list your place on Beddn and start earning.",
    images: ["/images/cat-all.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${kualine.variable} ${tripSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
