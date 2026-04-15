import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { InstallPromptProvider } from "@/app/components/InstallPromptProvider";
import { NetworkStatusProvider } from "@/app/components/NetworkStatusProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const siteTitle = "Liftly — AI Gym Tracker & Progressive Overload App";
const siteDescription =
  "Track workouts, build strength, and improve faster with AI-powered insights. Liftly helps you log workouts, measure progress, and stay consistent.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Liftly",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Liftly — AI Gym Tracker",
    description: "AI-powered workout tracking and strength analytics.",
    type: "website",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "Liftly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liftly — AI Gym Tracker",
    description: "AI-powered workout tracking and strength analytics.",
    images: ["/preview.png"],
  },
  themeColor: "#000000",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NetworkStatusProvider>
          <InstallPromptProvider>
            {children}
            <Analytics />
          </InstallPromptProvider>
        </NetworkStatusProvider>
      </body>
    </html>
  );
}
