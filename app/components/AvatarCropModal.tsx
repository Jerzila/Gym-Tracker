"use client";

import { useCallback, useId, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/app/components/Button";
import "react-easy-crop/react-easy-crop.css";

type AvatarCropModalProps = {
  imageUrl: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

async function createCroppedAvatar(imageUrl: string, areaPixels: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load selected image."));
    img.src = imageUrl;
  });

  const size = Math.max(256, Math.round(Math.max(areaPixels.width, areaPixels.height)));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image canvas.");
  }

  ctx.clearRect(0, 0, size, size);

  // Keep only circular pixels in the exported square image.
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    areaPixels.x,
    areaPixels.y,
    areaPixels.width,
    areaPixels.height,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.95)
  );
  if (!blob) {
    throw new Error("Could not export cropped image.");
  }

  return new File([blob], `avatar-${Date.now()}.png`, { type: "image/png" });
}

export function AvatarCropModal({ imageUrl, open, onCancel, onConfirm }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const disabled = exporting || !croppedAreaPixels;
  const sliderLabelId = useId();

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setError(null);
    setExporting(true);
    try {
      const file = await createCroppedAvatar(imageUrl, croppedAreaPixels);
      onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop image.");
      setExporting(false);
      return;
    }
    setExporting(false);
  }, [croppedAreaPixels, imageUrl, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 sm:items-center sm:justify-center">
      <div className="w-full rounded-t-2xl border border-zinc-800 bg-zinc-950 p-4 pb-5 sm:max-w-md sm:rounded-2xl">
        <p className="text-base font-semibold text-zinc-100">Adjust profile photo</p>
        <p className="mt-1 text-xs text-zinc-500">Pinch or drag to position your avatar.</p>

        <div className="relative mt-4 h-[300px] w-full overflow-hidden rounded-xl bg-zinc-900">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={1}
            maxZoom={4}
            zoomSpeed={0.15}
            objectFit="horizontal-cover"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-4">
          <label id={sliderLabelId} htmlFor="avatar-zoom" className="mb-2 block text-xs text-zinc-400">
            Zoom
          </label>
          <input
            id="avatar-zoom"
            type="range"
            aria-labelledby={sliderLabelId}
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-300">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={disabled}>
            {exporting ? "Saving…" : "Use Photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
