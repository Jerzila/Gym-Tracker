"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  style?: CSSProperties;
};

export function PreviewImage({ src, alt, className, sizes, priority, style }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-gradient-to-br from-amber-500/25 via-zinc-800/80 to-zinc-950 ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
