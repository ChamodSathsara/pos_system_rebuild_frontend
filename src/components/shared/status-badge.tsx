import { Badge, type BadgeProps } from "@/components/ui/badge";

const TONE_MAP: Record<string, BadgeProps["variant"]> = {
  // Sale
  Completed: "success",
  Pending: "warning",
  Cancelled: "destructive",
  Refunded: "info",
  Failed: "destructive",
  // PO
  Open: "info",
  PartiallyReceived: "warning",
  FullyReceived: "success",
  Approved: "success",
  Rejected: "destructive",
  // Batch / Damage
  Available: "success",
  Expired: "destructive",
  Damaged: "destructive",
  Blocked: "secondary",
  Reported: "warning",
  Reviewed: "info",
  Disposed: "secondary",
  // Branch / general
  Active: "success",
  Inactive: "secondary",
  // Cashier shift
  Closed: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={TONE_MAP[status] ?? "secondary"}>{status.replace(/_/g, " ")}</Badge>;
}
