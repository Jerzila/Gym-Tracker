import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liftly – Track Your Strength. Beat Your PRs.",
  description:
    "Liftly is the gym tracker built for progressive overload. Log workouts, monitor strength gains, and understand your muscle development.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#0a0a0b] text-zinc-100">
      {children}
    </div>
  );
}
