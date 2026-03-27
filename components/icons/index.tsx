import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function withDefaults(size: number | undefined, props: IconProps) {
  const { className, ...rest } = props;
  return {
    width: size ?? 20,
    height: size ?? 20,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    ...rest,
  };
}

export function TrophyIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M6 6H4a2 2 0 0 0 2 3h2" />
      <path d="M18 6h2a2 2 0 0 1-2 3h-2" />
      <path d="M12 11v4" />
      <path d="M9 19h6" />
      <path d="M10 15h4v4h-4z" />
    </svg>
  );
}

export function FireIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1 3-1 4-1 6 0 1.8 1.5 3 3 3 2.3 0 4-1.9 4-4.2 0-3.1-2.4-5-4-6.8C13 2.4 12.5 2.8 12 3Z" />
      <path d="M10.6 11.5c-2 1-3.6 3-3.6 5.4A5 5 0 0 0 12 22a5 5 0 0 0 5-5.1c0-2.2-1.1-3.9-2.9-5.1-.4 2-1.7 3.2-3.1 3.2-1.4 0-2.4-1-2.4-2.5 0-.4 0-.7.1-1Z" />
    </svg>
  );
}

export function CalendarIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M7.5 3.5v3" />
      <path d="M16.5 3.5v3" />
      <path d="M3.5 9.5h17" />
    </svg>
  );
}

export function HomeIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11.5 12 4.75l8.5 6.75" />
      <path d="M6 10.5V20a1.75 1.75 0 0 0 1.75 1.75h8.5A1.75 1.75 0 0 0 18 20v-9.5" />
      <path d="M10 21.75V15.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6.25" />
    </svg>
  );
}

export function UserIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function SearchIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function UserPlusIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 11.7-6" />
      <path d="M19 14v6" />
      <path d="M16 17h6" />
    </svg>
  );
}

export function StrengthIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v4" />
      <path d="M7 9v6" />
      <path d="M17 9v6" />
      <path d="M20 10v4" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function ChartIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5h16" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-6.5" />
    </svg>
  );
}

export function GoatIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16c0-3.2 2.5-5.5 5.5-5.5S18 12.8 18 16" />
      <path d="M9.5 10c-.8-1.6-2-2.5-3.5-3" />
      <path d="M14.5 10c.8-1.6 2-2.5 3.5-3" />
      <path d="M10 16v3.5" />
      <path d="M15 16v3.5" />
      <path d="M11.5 13.2h2" />
    </svg>
  );
}

export function StarIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.6 5.2 5.7.8-4.1 4 1 5.6L12 16l-5.2 2.6 1-5.6-4.1-4 5.7-.8L12 3Z" />
    </svg>
  );
}

export function BoltIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 2.5 6 13h5l-1 8.5L18 11h-5l.5-8.5Z" />
    </svg>
  );
}

export function SettingsIcon({ size, ...props }: IconProps) {
  return (
    <svg {...withDefaults(size, props)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.2 14.2a7.8 7.8 0 0 0 .1-1.2 7.8 7.8 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.1 7.1 0 0 0-2-1.2l-.3-2.5h-4l-.3 2.5a7.1 7.1 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.2 7.8 7.8 0 0 0 .1 1.2l-2 1.5 2 3.5 2.4-1a7.1 7.1 0 0 0 2 1.2l.3 2.5h4l.3-2.5a7.1 7.1 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5Z" />
    </svg>
  );
}
