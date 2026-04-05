import type { Metadata } from "next";
import { Syne } from "next/font/google";

const landingDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liftly — Strength tracking & progressive overload",
  description:
    "Log workouts, track PRs and estimated 1RM, visualize muscle strength, and progress with clarity. Built for serious lifters.",
  robots: { index: false, follow: false },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${landingDisplay.variable} isolate`}>
      {children}
    </div>
  );
}
