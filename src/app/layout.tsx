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
  title: "Beddn — Find Unique Stays",
  description: "Book hourly stays, overnight getaways, and unique experiences.",
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
