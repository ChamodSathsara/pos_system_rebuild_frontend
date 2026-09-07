import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserFacingError } from "@/lib/errors";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const friendly = getUserFacingError(message, {
    title: "We could not load this information",
    description: "Check your connection and try again. Your existing data has not been changed.",
  });
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{friendly.title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{friendly.description}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
