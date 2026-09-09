import { TransferWorkspace } from "@/components/stock-transfers/transfer-workspace";

export default function Page() {
  return (
    <TransferWorkspace
      mode="queue"
      initialDirectOpen
      titleOverride="Stock Transfer"
    />
  );
}
