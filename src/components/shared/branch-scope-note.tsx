import { MapPin } from "lucide-react";

export function BranchScopeNote({ branchName }: { branchName?: string | null }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
      <MapPin className="h-3.5 w-3.5" />
      Showing data for {branchName || "your branch"} only
    </div>
  );
}
