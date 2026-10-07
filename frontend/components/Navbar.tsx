"use client";

import {
  CalendarDays,
  Globe,
  Heart,
  Home,
  LogOut,
  Menu,
  Moon,
  Repeat,
  Search,
  Sun,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AirbnbLogo } from "@/components/AirbnbLogo";
import { SearchModal } from "@/components/SearchModal";
import { useSearch } from "@/context/SearchContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { describeSearch } from "@/lib/format";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Global sticky navbar.
 *
 * - Home: shows the expandable three-part search pill.
 * - Listing detail: shows a simplified header (logo + account menu), matching
 *   how Airbnb trims the nav on detail pages.
 */
export function Navbar() {
  const pathname = usePathname();
  const isDetail = pathname?.startsWith("/listings/") ?? false;

  const { filters } = useSearch();
  const { user, isHost, toggleRole } = useUser();
  const { theme, toggle } = useTheme();
  const toast = useToast();

  // The mock-auth profile arrives from the API, so it is null on the server.
  // Guard user-dependent UI until after mount so the server HTML and the first
  // client render match (otherwise the profile can resolve mid-hydration).
  const hydrated = useHydrated();
  const displayUser = hydrated ? user : null;
  const displayIsHost = hydrated && isHost;

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account dropdown when clicking anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const summary = describeSearch(
    filters.city,
    filters.checkIn,
    filters.checkOut,
    filters.guests
  );

  const handleSwitchRole = () => {
    toggleRole();
    setMenuOpen(false);
    toast.success(
      isHost ? "Switched to travelling mode" : "Switched to hosting mode"
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-hairline-soft bg-canvas">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label="Airbnb home">
          <AirbnbLogo className="text-2xl" />
        </Link>

        {/* Centre search pill */}
        {!isDetail && (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden items-center rounded-full border border-hairline shadow-sm transition-shadow hover:shadow-md sm:flex"
          >
            <span className="px-5 py-2.5 text-sm font-medium">{summary.where}</span>
            <span className="hidden border-l border-hairline-soft px-5 py-2.5 text-sm font-medium lg:block">
              {summary.when}
            </span>
            <span className="flex items-center gap-3 border-l border-hairline-soft py-1.5 pl-5 pr-1.5 text-sm">
              <span className="hidden font-medium text-muted lg:block">{summary.who}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-rausch text-white">
                <Search className="h-3.5 w-3.5" />
              </span>
            </span>
          </button>
        )}

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Mobile: the full search pill is hidden, so expose a search button. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            href={displayIsHost ? "/host" : "/host/create"}
            className="hidden rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-surface md:block"
          >
            {displayIsHost ? "Manage listings" : "Airbnb your home"}
          </Link>
          <button
            type="button"
            aria-label="Language and currency"
            className="hidden h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface md:grid"
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Account menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full border border-hairline py-1.5 pl-3 pr-1.5 transition-shadow hover:shadow-md"
            >
              <Menu className="h-4 w-4" />
              {displayUser?.avatar_url ? (
                <Image
                  src={displayUser.avatar_url}
                  alt={displayUser.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="h-7 w-7 rounded-full bg-muted" />
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-hairline-soft bg-canvas py-2 shadow-modal"
              >
                {user && (
                  <div className="border-b border-hairline-soft px-4 py-3">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted">
                      Signed in as {user.role === "both" ? "host & guest" : user.role}
                    </p>
                  </div>
                )}
                <MenuItem href="/trips" icon={<CalendarDays className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                  My trips
                </MenuItem>
                <MenuItem href="/wishlist" icon={<Heart className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                  Wishlists
                </MenuItem>
                <MenuItem
                  href={isHost ? "/host" : "/host/create"}
                  icon={<Home className="h-4 w-4" />}
                  onClick={() => setMenuOpen(false)}
                >
                  {isHost ? "Manage listings" : "Airbnb your home"}
                </MenuItem>

                <div className="my-2 border-t border-hairline-soft" />

                <button
                  type="button"
                  onClick={handleSwitchRole}
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface"
                >
                  <Repeat className="h-4 w-4 text-muted" />
                  {isHost ? "Switch to travelling" : "Switch to hosting"}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface"
                >
                  <LogOut className="h-4 w-4 text-muted" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function MenuItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
