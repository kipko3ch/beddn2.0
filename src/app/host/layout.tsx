import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Host Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HostRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
