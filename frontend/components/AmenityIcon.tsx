import {
  Bath,
  Car,
  ChefHat,
  Coffee,
  CookingPot,
  Dumbbell,
  Flame,
  Key,
  Laptop,
  Mountain,
  PawPrint,
  ShieldCheck,
  Thermometer,
  Tv,
  Umbrella,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * The backend stores each amenity's Lucide icon name (e.g. "Wifi") in
 * `amenity.icon_name`. Mapping those names to components here keeps the icon
 * set in one place and lets the API stay data-driven.
 */
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Wifi,
  ChefHat,
  Car,
  Waves,
  Tv,
  WashingMachine,
  Wind,
  Thermometer,
  Laptop,
  Flame,
  Bath,
  CookingPot,
  Dumbbell,
  PawPrint,
  ShieldCheck,
  Coffee,
  Umbrella,
  Mountain,
  Key,
  Zap,
};

export function AmenityIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Wifi;
  return <Icon className={className} />;
}
