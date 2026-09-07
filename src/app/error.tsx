"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">This page could not be displayed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your saved data is safe. Try loading the page again; if the problem continues, contact support.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Support reference: {error.digest}</p>}
        <Button className="mt-5" onClick={reset}>
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
      </div>
    </div>
  );
}
