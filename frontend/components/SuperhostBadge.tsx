import { Award } from "lucide-react";

/**
 * Airbnb's Superhost trust badge. Status is computed on the backend from the
 * host's aggregate rating/review/listing counts and surfaced here.
 */
export function SuperhostBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rausch/10 px-2.5 py-1 text-xs font-semibold text-rausch ${className}`}
    >
      <Award className="h-3.5 w-3.5" />
      Superhost
    </span>
  );
}
