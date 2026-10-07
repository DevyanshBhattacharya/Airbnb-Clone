import { Suspense } from "react";

import { ListingFormRoute } from "@/components/ListingFormRoute";

/**
 * Host listing form: create when opened directly, or edit when the host
 * dashboard links here with `?edit=<id>`.
 */
export default function CreateListingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted">
          Loading form…
        </div>
      }
    >
      <ListingFormRoute />
    </Suspense>
  );
}
