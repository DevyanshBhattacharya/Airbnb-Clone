"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SuperhostBadge } from "@/components/SuperhostBadge";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { deleteListing, getHostDashboard } from "@/lib/api";
import { formatPrice, formatShortDate } from "@/lib/format";
import type { HostDashboard } from "@/lib/types";

/**
 * Host dashboard: headline stats, the host's listings with edit/delete, and
 * the reservations guests have made on them. Guarded so a guest sees a prompt
 * to switch into hosting mode instead of an error.
 */
export default function HostDashboardPage() {
  const { user, isHost, toggleRole } = useUser();
  const toast = useToast();

  const [data, setData] = useState<HostDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user || !isHost) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getHostDashboard(user.id)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, isHost]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number, title: string) => {
    if (!user) return;
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteListing(id, user.id);
      toast.success("Listing deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete listing");
    }
  };

  // --- Guest view: invite them to switch into hosting mode -------------------
  if (!loading && !isHost) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Host dashboard</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          You&apos;re currently in travelling mode. Switch to hosting to manage
          listings and see reservations.
        </p>
        <button
          type="button"
          onClick={toggleRole}
          className="mt-8 rounded-xl bg-rausch px-6 py-3 font-semibold text-white transition-colors hover:bg-rausch-dark"
        >
          Switch to hosting
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">Host dashboard</h1>
            {data?.host.is_superhost && <SuperhostBadge />}
          </div>
          <p className="mt-1 text-sm text-muted">
            {data ? `Welcome back, ${data.host.name}.` : "Manage your listings."}
          </p>
        </div>
        <Link
          href="/host/create"
          className="flex items-center gap-2 rounded-xl bg-rausch px-5 py-3 text-sm font-semibold text-white hover:bg-rausch-dark"
        >
          <Plus className="h-4 w-4" />
          Add listing
        </Link>
      </div>

      {loading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-hairline-soft" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="mt-8 rounded-2xl border border-hairline p-8 text-center">
          <p className="font-medium">Couldn&apos;t load your dashboard.</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Listings" value={String(data.stats.total_listings)} />
            <Stat label="Reservations" value={String(data.stats.total_reservations)} />
            <Stat
              label="Upcoming"
              value={String(data.stats.upcoming_reservations)}
            />
            <Stat label="Earnings" value={formatPrice(data.stats.total_earnings)} />
          </div>

          {/* Listings */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Your listings</h2>
            {data.listings.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-hairline p-10 text-center">
                <p className="text-muted">You haven&apos;t created any listings yet.</p>
                <Link
                  href="/host/create"
                  className="mt-4 inline-block rounded-xl bg-rausch px-6 py-3 font-semibold text-white hover:bg-rausch-dark"
                >
                  Create your first listing
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {data.listings.map((listing) => (
                  <div
                    key={listing.id}
                    data-testid="host-listing-row"
                    className="flex flex-col gap-4 rounded-2xl border border-hairline p-4 sm:flex-row sm:items-center"
                  >
                    <Link
                      href={`/listings/${listing.id}`}
                      className="flex flex-1 items-center gap-4"
                    >
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-hairline-soft">
                        {listing.primary_image && (
                          <Image
                            src={listing.primary_image}
                            alt={listing.title}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{listing.title}</p>
                        <p className="truncate text-sm text-muted">
                          {listing.city}, {listing.country} · {listing.category}
                        </p>
                        <p className="mt-1 text-sm">
                          {formatPrice(listing.price_per_night)} night ·{" "}
                          {listing.review_count} review
                          {listing.review_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </Link>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/host/create?edit=${listing.id}`}
                        className="flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 text-sm font-medium hover:bg-surface"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(listing.id, listing.title)}
                        className="flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-rausch hover:bg-surface"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reservations */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Reservations</h2>
            {data.reservations.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No reservations yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Listing</th>
                      <th className="px-4 py-3 font-medium">Guest</th>
                      <th className="px-4 py-3 font-medium">Dates</th>
                      <th className="px-4 py-3 font-medium">Guests</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reservations.map((reservation) => (
                      <tr key={reservation.id} className="border-t border-hairline-soft">
                        <td className="px-4 py-3">{reservation.listing_title}</td>
                        <td className="px-4 py-3">{reservation.guest_name}</td>
                        <td className="px-4 py-3">
                          {formatShortDate(reservation.check_in)} –{" "}
                          {formatShortDate(reservation.check_out)}
                        </td>
                        <td className="px-4 py-3">{reservation.guest_count}</td>
                        <td className="px-4 py-3">{formatPrice(reservation.total_price)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              reservation.status === "confirmed"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-surface text-muted"
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-xs text-muted">
                  Booked {data.reservations.length} reservation
                  {data.reservations.length === 1 ? "" : "s"} · latest first
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
