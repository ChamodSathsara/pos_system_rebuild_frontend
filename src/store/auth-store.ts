"use client";

import { create } from "zustand";
import { authApi } from "@/lib/api";
import { refreshAccessToken } from "@/lib/api/client";
import { clearSession, getStoredUser, hasValidAccessToken, setAccessToken, setStoredUser } from "@/lib/token";
import type { CurrentUser } from "@/types";
import { isBranchScoped } from "@/lib/permissions";

interface AuthState {
  user: CurrentUser | null;
  isHydrated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: CurrentUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isHydrated: false,
  isLoading: false,

  setUser: (user) => set({ user }),

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ username, password });
      setAccessToken(res.accessToken);
      setStoredUser(res.user);
      set({ user: res.user, isHydrated: true });
      return res.user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort; still clear local session
    }
    clearSession();
    set({ user: null });
  },

  hydrate: async () => {
    if (get().isHydrated) return;
    const cached = getStoredUser<CurrentUser>();
    if (cached) set({ user: cached });
    if (!hasValidAccessToken()) {
      try {
        await refreshAccessToken();
      } catch {
        set({ user: null, isHydrated: true });
        return;
      }
    }
    try {
      const me = await authApi.me();
      setStoredUser(me);
      set({ user: me, isHydrated: true });
    } catch {
      // A temporary /me or network failure must not destroy a valid session.
      // A failed refresh has already cleared storage in refreshAccessToken().
      set({ user: getStoredUser<CurrentUser>(), isHydrated: true });
    }
  },
}));

/** For Branch_Manager/Cashier, always force their own branch; others may pass a chosen filter or undefined for all. */
export function useEffectiveBranchCode(selected?: string | null): string | undefined {
  const user = useAuthStore((s) => s.user);
  if (isBranchScoped(user?.roleName)) {
    return user?.branchCode ?? undefined;
  }
  return selected ?? undefined;
}
