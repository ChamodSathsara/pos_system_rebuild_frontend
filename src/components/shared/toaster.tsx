"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "!bg-card !text-foreground !border !border-border !shadow-lg !rounded-lg",
          title: "!text-sm !font-semibold",
          description: "!text-xs !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-secondary !text-secondary-foreground",
          success: "!border-l-4 !border-l-success",
          error: "!border-l-4 !border-l-destructive",
        },
      }}
    />
  );
}
