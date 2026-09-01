import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

export interface UseApiMutationOptions<TData, TVariables> {
  successMessage?: string | ((data: TData, vars: TVariables) => string);
  invalidateKeys?: readonly (readonly unknown[])[];
  onSuccess?: (data: TData, vars: TVariables) => void;
  onError?: (err: ApiError, vars: TVariables) => void;
}

/**
 * Wraps useMutation with automatic error toasts (using the backend's message/errors)
 * and optional query-key invalidation + success toast on completion.
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  opts?: UseApiMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { successMessage, invalidateKeys, onSuccess, onError } = opts ?? {};

  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    onSuccess: (data, vars) => {
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key as unknown[] }));
      }
      if (successMessage) {
        toast.success(typeof successMessage === "function" ? successMessage(data, vars) : successMessage);
      }
      onSuccess?.(data, vars);
    },
    onError: (err, vars) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      const details = err instanceof ApiError ? err.errors : null;
      toast.error(message, details && details.length ? { description: details.join(", ") } : undefined);
      onError?.(err, vars);
    },
  });
}
