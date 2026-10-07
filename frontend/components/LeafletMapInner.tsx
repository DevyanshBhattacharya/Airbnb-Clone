"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { formatPrice } from "@/lib/format";

/** A single listing plotted on the map. */
export interface MapMarker {
  id: number;
  title: string;
  price: number;
  latitude: number;
  longitude: number;
  image: string | null;
  city: string;
}

/** Price-pill marker (Airbnb-style) instead of Leaflet's default image icon. */
function priceIcon(price: number) {
  return L.divIcon({
    className: "airbnb-pin",
    html: `<span>${formatPrice(price)}</span>`,
    iconSize: [72, 32],
    iconAnchor: [36, 32],
  });
}

/** Fits the viewport to the markers (or zooms in on a single listing). */
function FitBounds({ markers, single }: { markers: MapMarker[]; single: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;
    if (single || markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 13);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((marker) => [marker.latitude, marker.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  }, [markers, single, map]);

  return null;
}

/**
 * The actual Leaflet map. Loaded only on the client (see LeafletMap.tsx) because
 * Leaflet touches `window` at import time.
 */
export default function LeafletMapInner({
  markers,
  single = false,
}: {
  markers: MapMarker[];
  single?: boolean;
}) {
  const center: [number, number] =
    markers.length > 0
      ? [markers[0].latitude, markers[0].longitude]
      : [37.7749, -122.4194];

  return (
    <MapContainer
      center={center}
      zoom={single ? 13 : 4}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} single={single} />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={priceIcon(marker.price)}
        >
          <Popup>
            <div className="w-44">
              {marker.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={marker.image}
                  alt={marker.title}
                  className="h-24 w-full rounded-lg object-cover"
                />
              )}
              <p className="mt-2 text-sm font-semibold">{marker.title}</p>
              <p className="text-xs text-muted">{marker.city}</p>
              <p className="mt-1 text-sm font-semibold">
                {formatPrice(marker.price)} <span className="font-normal">/ night</span>
              </p>
              <Link href={`/listings/${marker.id}`} className="text-xs font-semibold text-rausch">
                View listing →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
