"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, User as UserIcon, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { initialsOf } from "@/lib/format";
import { MapPin } from "lucide-react";
import { useCashierShiftSession } from "./cashier-shift-guard";

export function Topbar({ title }: { title?: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { requestLogout } = useCashierShiftSession();

  const handleLogout = async () => {
    if (requestLogout) {
      requestLogout();
      return;
    }
    await logout();
    router.replace("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar className="w-full" collapsible={false} />
          </SheetContent>
        </Sheet>
        {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
      </div>

      <div className="flex items-center gap-3">
        {user?.branchCode && (
          <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
            <MapPin className="h-3 w-3" />
            {user.branchCode}
          </Badge>
        )}
        <Badge variant="default" className="hidden sm:inline-flex">
          {(user?.roleName || "").toString().replace(/_/g, " ")}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initialsOf(user?.fullName || user?.username)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.fullName || user?.username}</p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email || user?.username}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="h-4 w-4" /> Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
