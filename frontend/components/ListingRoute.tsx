"use client";

import { useParams } from "next/navigation";

import { ListingDetailView } from "@/components/ListingDetailView";

/**
 * Client-side reader for the `[id]` route param.
 *
 * `useParams` reads URL data, which isn't available while the static shell is
 * prerendered, so this component is rendered inside a <Suspense> boundary by
 * the page (see app/listings/[id]/page.tsx).
 */
export function ListingRoute() {
  const { id } = useParams<{ id: string }>();
  return <ListingDetailView listingId={Number(id)} />;
}
