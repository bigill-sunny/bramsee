import type { Metadata, Viewport } from "next";
import {PwaProvider} from './pwa';
import "./globals.css";

export const metadata: Metadata = {
  title: "Bramsee — Your next move",
  description: "Clear next steps. Real Brampton arrivals. A calmer way to get there.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable:true,title:"Bramsee",statusBarStyle:"default"},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#174c40'};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><PwaProvider>{children}</PwaProvider></body>
    </html>
  );
}
