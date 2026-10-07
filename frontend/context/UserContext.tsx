"use client";

/**
 * Mock auth in the browser.
 *
 * The backend identifies the acting user purely by the `X-User-Id` header, so
 * "switching between Guest and Host mode" is just switching this id. We keep it
 * in React state (persisted to localStorage so a refresh keeps the mode) and
 * expose it to every component through context.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getUsers } from "@/lib/api";
import type { User } from "@/lib/types";

interface UserContextValue {
  /** The acting profile, or null while the profile list is loading. */
  user: User | null;
  users: User[];
  loading: boolean;
  /** True when the acting profile is allowed to host. */
  isHost: boolean;
  setUserId: (id: number) => void;
  /** Flip between the seeded guest and host demo profiles. */
  toggleRole: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_KEY = "airbnb-clone:user-id";
const DEFAULT_GUEST_ID = 1;

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserIdState] = useState<number>(DEFAULT_GUEST_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getUsers()
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {
        if (active) setUsers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setUserIdState(Number(stored));

    return () => {
      active = false;
    };
  }, []);

  const setUserId = (id: number) => {
    setUserIdState(id);
    window.localStorage.setItem(STORAGE_KEY, String(id));
  };

  const value = useMemo<UserContextValue>(() => {
    const user = users.find((u) => u.id === userId) ?? users[0] ?? null;
    const guest = users.find((u) => u.role === "guest");
    const host = users.find((u) => u.role === "host" || u.role === "both");

    return {
      user,
      users,
      loading,
      isHost: user?.role === "host" || user?.role === "both",
      setUserId,
      toggleRole: () => {
        // If we're the host profile, drop back to the guest demo user and vice versa.
        const target =
          user && (user.role === "host" || user.role === "both") ? guest : host;
        if (target) setUserId(target.id);
      },
    };
  }, [users, userId, loading]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return context;
}
