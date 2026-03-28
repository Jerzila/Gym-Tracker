"use client";

import type { ButtonHTMLAttributes } from "react";

const base =
  "tap-feedback inline-flex items-center justify-center rounded-lg font-medium outline-none cursor-pointer select-none " +
  "transition-[transform,filter,background-color,color,box-shadow,border-color] duration-[100ms] ease-out " +
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:shadow-md hover:shadow-amber-500/20 focus-visible:ring-amber-500",
  secondary:
    "border border-zinc-600 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-500 hover:shadow-sm focus-visible:ring-zinc-500",
  sidebar:
    "w-full rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-zinc-600",
  sidebarActive: "!bg-zinc-700/80 !text-zinc-100",
  ghost:
    "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-zinc-600",
  danger:
    "text-zinc-500 hover:bg-zinc-800 hover:text-red-400 focus-visible:ring-zinc-600",
  modalCancel:
    "rounded px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
  modalConfirm:
    "rounded px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50",
  icon: "rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
} as const;

type Variant = keyof typeof variants;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** For sidebar nav: pass true when this link is active */
  active?: boolean;
  size?: "sm" | "md" | "default";
};

const sizeClasses = {
  sm: "px-2 py-1 text-xs",
  md: "px-4 py-2.5 text-sm",
  default: "px-4 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  active,
  size = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variantClass = variant === "sidebar" && active
    ? `${variants.sidebar} ${variants.sidebarActive}`
    : variants[variant];
  const sizeClass = sizeClasses[size];

  return (
    <button
      type="button"
      className={`${base} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

/** For use with <Link> or form submit: apply same visual feedback via data attributes + CSS. */
export const buttonClass = {
  primary: `${base} ${variants.primary} ${sizeClasses.md}`,
  secondary: `${base} ${variants.secondary} ${sizeClasses.md}`,
  sidebar: (active: boolean) =>
    `${base} ${variants.sidebar} ${active ? variants.sidebarActive : ""} w-full rounded-lg px-3 py-2.5 text-left text-sm`,
  ghost: `${base} ${variants.ghost} ${sizeClasses.md}`,
  danger: `${base} ${variants.danger} ${sizeClasses.md}`,
  icon: `${base} ${variants.icon}`,
  modalCancel: `${base} ${variants.modalCancel}`,
  modalConfirm: `${base} ${variants.modalConfirm}`,
};
