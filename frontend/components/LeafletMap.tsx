"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper around Leaflet.
 *
 * Leaflet reads `window` when imported, so it can't run during SSR/prerender.
 * `next/dynamic` with `ssr: false` defers it to the browser and shows a
 * placeholder in the static shell.
 */
export const LeafletMap = dynamic(() => import("@/components/LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-surface text-sm text-muted">
      Loading map…
    </div>
  ),
});
