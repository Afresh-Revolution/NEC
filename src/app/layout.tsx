import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "NEC Naija — Stronger together. Growing together.",
  description:
    "A cooperative for the entertainers shaping Northern Nigeria. Find your people, build your craft, and grow together.",
  applicationName: "NEC Naija",
  icons: { icon: "/nec-naija-mark.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
