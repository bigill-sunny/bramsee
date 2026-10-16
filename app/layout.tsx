import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bramsee — Your next move",
  description: "Clear next steps. Real Brampton arrivals. A calmer way to get there.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
