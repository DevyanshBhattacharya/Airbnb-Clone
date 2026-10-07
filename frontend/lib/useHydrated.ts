"use client";

import { useEffect, useState } from "react";

/**
 * Returns false during the server render and the first client render, then true
 * after the component has mounted.
 *
 * Use it to guard UI that depends on client-only data (like the mock-auth
 * profile). The server and the first client render then agree on the same
 * placeholder markup, which prevents React hydration mismatches when that data
 * resolves mid-hydration. The real value appears in a normal update afterwards.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
