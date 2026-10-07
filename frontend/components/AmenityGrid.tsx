import { AmenityIcon } from "@/components/AmenityIcon";
import type { Amenity } from "@/lib/types";

/** Two-column grid of amenities with their Lucide icons. */
export function AmenityGrid({ amenities }: { amenities: Amenity[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {amenities.map((amenity) => (
        <div key={amenity.id} className="flex items-center gap-4">
          <AmenityIcon name={amenity.icon_name} className="h-6 w-6 shrink-0 text-ink" />
          <span className="text-sm">{amenity.name}</span>
        </div>
      ))}
    </div>
  );
}
