"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isNavItemVisible } from "@/config/nav";
import { useAuthStore } from "@/store/auth-store";

export function Sidebar({
  className,
  collapsible = true,
}: {
  className?: string;
  collapsible?: boolean;
}) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.roleName);
  const isPosTerminal = pathname === "/pos" || pathname.startsWith("/pos/");
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const collapsed = isPosTerminal || manuallyCollapsed;

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {collapsible && !isPosTerminal && (
        <button
          type="button"
          onClick={() => setManuallyCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}

      <div className={cn("flex h-14 items-center gap-2.5 border-b border-sidebar-border", collapsed ? "justify-center px-3" : "px-5")}>
        <Image src="/vpos-icon.png" alt="Vantage POS" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" priority />
        {!collapsed && <span className="whitespace-nowrap text-[15px] font-bold text-white">Vantage POS</span>}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 scrollbar-thin", collapsed ? "px-2" : "px-3")}>
        <nav className="space-y-5">
          {NAV_GROUPS.map((group) => {
            if (role === "InventoryClerk" && group.label !== "Main Warehouse") return null;
            const items = group.items.filter((item) => isNavItemVisible(item, role));
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                <div className={cn("space-y-0.5", !collapsed && "mt-1.5")}>
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          collapsed && "justify-center px-2",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")} />
                        {!collapsed && item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <div className={cn("border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/40", collapsed && "px-2 text-center")}>
        {collapsed ? "v1.0" : "Vantage POS v1.0"}
      </div>
    </aside>
  );
}
