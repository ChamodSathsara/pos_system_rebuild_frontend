import { AuthGuard } from "@/components/layout/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CashierShiftGuard } from "@/components/layout/cashier-shift-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <CashierShiftGuard>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar className="hidden lg:flex" />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </CashierShiftGuard>
    </AuthGuard>
  );
}
