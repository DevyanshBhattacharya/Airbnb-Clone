"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import type { ListingImage } from "@/lib/types";

/** Full-screen photo gallery opened from the detail page. */
export function PhotoViewer({
  images,
  title,
  startIndex,
  onClose,
}: {
  images: ListingImage[];
  title: string;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);

  const step = (delta: number) => {
    setIndex((current) => (current + delta + images.length) % images.length);
  };

  // Arrow-key navigation + Escape to close.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm">
          {index + 1} / {images.length}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous photo"
          className="absolute left-6 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative max-h-full w-full max-w-5xl">
          <Image
            src={images[index].url}
            alt={`${title} photo ${index + 1}`}
            width={1600}
            height={1067}
            className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain"
            priority
          />
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next photo"
          className="absolute right-6 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
