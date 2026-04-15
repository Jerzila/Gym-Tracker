import type { Metadata } from "next";
import { Syne } from "next/font/google";

const landingDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liftly — AI Gym Tracker & Progressive Overload App",
  description:
    "Track workouts, build strength, and improve faster with AI-powered insights. Liftly helps you log workouts, measure progress, and stay consistent.",
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
