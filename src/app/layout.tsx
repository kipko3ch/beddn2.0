import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const tripSans = localFont({
  src: "../../public/fonts/trip-sans-variable.ttf",
  variable: "--font-trip-sans",
  display: "swap",
});

const tripSansMono = localFont({
  src: "../../public/fonts/trip-sans-mono-regular.otf",
  variable: "--font-trip-sans-mono",
  display: "swap",
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
      className={`${tripSans.variable} ${tripSansMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
