const PREVIEWS = [
  { src: "/IMG_2670.PNG", alt: "Liftly dashboard" },
  { src: "/exercises-preview.PNG", alt: "Liftly exercises" },
  { src: "/insights-preview.PNG", alt: "Liftly insights" },
  { src: "/IMG_2669.PNG", alt: "Liftly insights" },
] as const;

export function AppPreview() {
  return (
    <div className="flex flex-nowrap justify-center items-center gap-4 mb-8 overflow-x-auto">
      {PREVIEWS.map(({ src, alt }) => (
        <img
          key={src}
          src={src}
          alt={alt}
          width={100}
          height={160}
          className="w-[100px] h-[160px] rounded-xl border border-zinc-800 shadow-md object-cover"
        />
      ))}
    </div>
  );
}
