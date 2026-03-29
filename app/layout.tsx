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

export const metadata: Metadata = {
  title: "Liftly – Gym Tracker & Progressive Overload",
  description: "Personal strength tracking with progressive overload",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Liftly",
  },
  icons: {
    icon: "/liftlyicon.jpg",
    apple: "/liftlyicon.jpg",
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
      <head>
        <link rel="icon" href="/liftlyicon.jpg" />
        <link rel="apple-touch-icon" href="/liftlyicon.jpg" />
      </head>
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
