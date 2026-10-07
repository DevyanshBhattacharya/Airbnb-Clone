"use client";

import { useState } from "react";
import Image from "next/image";

import { PhotoViewer } from "@/components/PhotoViewer";
import type { ListingImage } from "@/lib/types";

/**
 * Airbnb's 5-photo hero: one large image on the left, four smaller ones in a
 * 2x2 grid on the right. On mobile it collapses to a single image. "Show all
 * photos" opens the full-screen viewer.
 */
export function PhotoGrid({
  images,
  title,
}: {
  images: ListingImage[];
  title: string;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="mt-4 grid h-[300px] place-items-center rounded-2xl bg-hairline-soft text-muted">
        No photos
      </div>
    );
  }

  const openAt = (index: number) => {
    setStartIndex(index);
    setViewerOpen(true);
  };

  const thumbs = images.slice(1, 5);

  return (
    <>
      <div className="mt-4 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:h-[420px]">
        {/* Hero image (full width on mobile) */}
        <button
          type="button"
          onClick={() => openAt(0)}
          className="relative col-span-4 row-span-2 aspect-[4/3] md:col-span-2 md:aspect-auto"
        >
          <Image
            src={images[0].url}
            alt={title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-opacity hover:opacity-95"
          />
        </button>

        {/* Four secondary images (desktop only) */}
        {thumbs.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => openAt(index + 1)}
            className="relative hidden md:block"
          >
            <Image
              src={image.url}
              alt={`${title} photo ${index + 2}`}
              fill
              sizes="25vw"
              className="object-cover transition-opacity hover:opacity-95"
            />
          </button>
        ))}
      </div>

      {viewerOpen && (
        <PhotoViewer
          images={images}
          title={title}
          startIndex={startIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
