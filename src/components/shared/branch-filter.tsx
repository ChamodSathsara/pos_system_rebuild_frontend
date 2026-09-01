"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches } from "@/hooks/use-organization";
import { useAuthStore } from "@/store/auth-store";
import { isBranchScoped } from "@/lib/permissions";
import { BranchScopeNote } from "./branch-scope-note";
import { Skeleton } from "@/components/ui/skeleton";

export function BranchFilter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (branchCode: string | undefined) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: branches, isLoading } = useBranches();
  const scoped = isBranchScoped(user?.roleName);

  if (scoped) {
    const branchName = branches?.find((b) => b.branchCode === user?.branchCode)?.branchName;
    return <BranchScopeNote branchName={branchName ? `${branchName} (${user?.branchCode})` : user?.branchCode} />;
  }

  if (isLoading) return <Skeleton className="h-9 w-44" />;

  return (
    <Select value={value ?? "__all__"} onValueChange={(v) => onChange(v === "__all__" ? undefined : v)}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder="All branches" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All branches</SelectItem>
        {branches?.map((b) => (
          <SelectItem key={b.branchCode} value={b.branchCode}>
            {b.branchName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
