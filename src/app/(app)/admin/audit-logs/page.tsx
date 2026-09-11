"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, FilterX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuditLog, useAuditLogs } from "@/hooks/use-security";
import { formatDateTime } from "@/lib/format";
import type { AuditLog, AuditLogFilters } from "@/types";

const PAGE_SIZE = 50;

function readableJson(value?: string | null) {
  if (!value) return "No value recorded.";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<Omit<AuditLogFilters, "pageNumber" | "pageSize">>({});
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedId, setSelectedId] = useState<number>();
  const query = { ...filters, pageNumber, pageSize: PAGE_SIZE };
  const { data, isLoading, isError, refetch } = useAuditLogs(query);
  const { data: selected, isLoading: isLoadingDetail } = useAuditLog(selectedId);

  const columns = useMemo<ColumnDef<AuditLog>[]>(() => [
    { accessorKey: "actionTime", header: "Time", cell: ({ row }) => formatDateTime(row.original.actionTime) },
    { accessorKey: "fullName", header: "User", cell: ({ row }) => <div><p className="font-medium">{row.original.fullName || row.original.username || row.original.userCode || "System"}</p><p className="text-xs text-muted-foreground">{row.original.username || row.original.userCode || "—"}</p></div> },
    { accessorKey: "action", header: "Action", cell: ({ row }) => <Badge variant="outline">{row.original.action || "—"}</Badge> },
    { accessorKey: "entityType", header: "Affected Record", cell: ({ row }) => <div><p>{row.original.entityType || row.original.tableName || "—"}</p><p className="text-xs text-muted-foreground">{row.original.tableName}{row.original.recordId ? ` · #${row.original.recordId}` : ""}</p></div> },
    { accessorKey: "branchCode", header: "Branch", cell: ({ row }) => row.original.branchCode || "All" },
    { accessorKey: "warehouseCode", header: "Warehouse", cell: ({ row }) => row.original.warehouseCode || "—" },
    { accessorKey: "actionStatus", header: "Status", cell: ({ row }) => <Badge variant={row.original.actionStatus === "Success" ? "success" : "secondary"}>{row.original.actionStatus || "—"}</Badge> },
  ], []);

  const updateFilter = (key: keyof AuditLogFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setPageNumber(1);
  };
  const clearFilters = () => { setFilters({}); setPageNumber(1); };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Review system activity, affected records, and before/after values." />
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterInput label="User code" value={filters.userCode} onChange={(value) => updateFilter("userCode", value)} placeholder="USR00001" />
        <FilterInput label="Action" value={filters.action} onChange={(value) => updateFilter("action", value)} placeholder="Modified" />
        <FilterInput label="Table name" value={filters.tableName} onChange={(value) => updateFilter("tableName", value)} placeholder="stock_inventory" />
        <FilterInput label="Record ID" value={filters.recordId} onChange={(value) => updateFilter("recordId", value)} placeholder="25" />
        <FilterInput label="Branch code" value={filters.branchCode} onChange={(value) => updateFilter("branchCode", value)} placeholder="BR001" />
        <FilterInput label="Warehouse code" value={filters.warehouseCode} onChange={(value) => updateFilter("warehouseCode", value)} placeholder="WH012" />
        <FilterInput label="Transaction ID" value={filters.transactionId} onChange={(value) => updateFilter("transactionId", value)} placeholder="GUID" />
        <div className="flex items-end"><Button type="button" variant="outline" onClick={clearFilters}><FilterX className="h-4 w-4" /> Clear filters</Button></div>
        <FilterInput label="From date" type="date" value={filters.fromDate} onChange={(value) => updateFilter("fromDate", value)} />
        <FilterInput label="To date" type="date" value={filters.toDate} onChange={(value) => updateFilter("toDate", value)} />
      </div>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} error={isError ? "Failed to load audit logs." : null} onRetry={refetch} searchPlaceholder="Search this page..." emptyTitle="No audit logs found" onRowClick={(log) => setSelectedId(log.logId)} pageSize={PAGE_SIZE} />
      {data && <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground"><span>{data.totalCount} logs · Page {data.pageNumber} of {Math.max(1, data.totalPages)}</span><Button variant="outline" size="icon" onClick={() => setPageNumber((page) => page - 1)} disabled={!data.hasPreviousPage}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => setPageNumber((page) => page + 1)} disabled={!data.hasNextPage}><ChevronRight className="h-4 w-4" /></Button></div>}

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>Audit record {selected?.logId ? `#${selected.logId}` : ""}</SheetTitle></SheetHeader>
          {isLoadingDetail ? <p className="mt-5 text-sm text-muted-foreground">Loading audit record...</p> : selected && <div className="mt-5 space-y-5"><div className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm"><Detail label="User" value={selected.fullName || selected.username || selected.userCode} /><Detail label="Exact time" value={formatDateTime(selected.actionTime)} /><Detail label="Action" value={selected.action} /><Detail label="Status" value={selected.actionStatus} /><Detail label="Affected table" value={selected.tableName} /><Detail label="Record ID" value={selected.recordId} /><Detail label="Branch" value={selected.branchCode} /><Detail label="Warehouse" value={selected.warehouseCode} /><Detail label="Transaction ID" value={selected.transactionId} /><Detail label="IP address" value={selected.ipAddress} /></div>{selected.reason && <Detail label="Reason" value={selected.reason} />}<ValueBlock title="Before" value={selected.oldValue} /><ValueBlock title="After" value={selected.newValue} />{selected.metadata && <ValueBlock title="Metadata" value={selected.metadata} />}</div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="break-all font-medium">{value || "—"}</p></div>;
}
function ValueBlock({ title, value }: { title: string; value?: string | null }) {
  return <section><h2 className="mb-2 font-semibold">{title}</h2><pre className="max-h-72 overflow-auto rounded-xl border bg-muted/30 p-3 text-xs leading-5 whitespace-pre-wrap break-words">{readableJson(value)}</pre></section>;
}
