"use client";

import { useSearchParams } from "next/navigation";

import { ListingForm } from "@/components/ListingForm";

/**
 * Reads the optional `?edit=<id>` query param and renders the listing form.
 *
 * `useSearchParams` reads URL data, so this component is rendered inside a
 * <Suspense> boundary by the page (Cache Components prerenders the shell
 * before URL data exists).
 */
export function ListingFormRoute() {
  const searchParams = useSearchParams();
  const edit = searchParams.get("edit");
  return <ListingForm editId={edit ? Number(edit) : undefined} />;
}
