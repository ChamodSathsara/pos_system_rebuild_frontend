"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, hydrate } = useAuthStore();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user, router]);

  useEffect(() => {
    if (!isHydrated || !user) return;
    const verifyAssignment = async () => {
      try {
        const current = await authApi.me();
        if (current.roleName !== user.roleName || current.branchCode !== user.branchCode || current.warehouseCode !== user.warehouseCode) {
          await logout();
          router.replace("/login");
        }
      } catch {
        // Authentication expiry is handled centrally by the Axios refresh flow.
      }
    };
    const timer = window.setInterval(verifyAssignment, 60_000);
    window.addEventListener("focus", verifyAssignment);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", verifyAssignment); };
  }, [isHydrated, user, logout, router]);

  useEffect(() => {
    if (!isHydrated || user?.roleName !== "InventoryClerk") return;
    // InventoryClerk is restricted to Central Warehouse operations, but device
    // preferences (receipt-printer setup) must remain available on every POS.
    const allowed = ["/main-warehouse", "/settings/printer"];
    if (!allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`))) router.replace("/main-warehouse");
  }, [isHydrated, user?.roleName, pathname, router]);

  if (!isHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
