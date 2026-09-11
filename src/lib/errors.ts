import axios from "axios";

export interface UserFacingError {
  title: string;
  description: string;
}

const STACK_TRACE_MARKERS = /\s+at\s+(?:PosApi|Microsoft|System|lambda_method|InvokeStub|[\w.]+Controller|[\w.]+Service)[\s\S]*$/i;
const TECHNICAL_DETAIL = /(?:\.cs:line\s+\d+|[A-Z]:\\|\/src\/|CancellationToken|ActionMethodExecutor|ExceptionDispatchInfo|StackTrace)/i;

const GENERIC_MESSAGES = [
  "request failed",
  "something went wrong",
  "an error occurred",
  "internal server error",
  "network error",
  "failed to fetch",
];

function isUsefulMessage(message?: string | null) {
  if (!message?.trim()) return false;
  const normalized = message.trim().toLowerCase().replace(/[.!]$/, "");
  return !GENERIC_MESSAGES.some((generic) => normalized === generic || normalized.startsWith("request failed with status code"));
}

function fallbackForStatus(status?: number): UserFacingError | null {
  switch (status) {
    case 400:
      return { title: "We could not process that request", description: "Check the entered information and try again." };
    case 401:
      return { title: "Your session has expired", description: "Sign in again to continue securely." };
    case 403:
      return { title: "You do not have access", description: "Ask an administrator to grant the required permission." };
    case 404:
      return { title: "The requested record was not found", description: "It may have been deleted or is no longer available. Refresh and try again." };
    case 409:
      return { title: "This change conflicts with existing data", description: "Refresh the latest data, review your changes, and try again." };
    case 422:
      return { title: "Some information needs attention", description: "Review the entered values and correct the indicated fields." };
    case 429:
      return { title: "Too many requests", description: "Wait a moment before trying again." };
    default:
      if (status && status >= 500) {
        return { title: "The server could not complete the request", description: "Your data was not changed. Try again shortly; contact support if it continues." };
      }
      return null;
  }
}

function comparable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Keeps useful validation/business details while preventing stack traces and source paths from reaching users. */
export function getUserFacingDetails(details: unknown, title?: string): string[] {
  const titleText = title ? comparable(title) : "";

  const values = typeof details === "string"
    ? [details]
    : Array.isArray(details)
      ? details
      : details && typeof details === "object"
        ? Object.values(details as Record<string, unknown>).flatMap((value) => Array.isArray(value) ? value : [value])
        : [];

  return [...new Set(values.flatMap((detail) => {
    if (typeof detail !== "string") return [];
    const cleaned = detail
      .replace(STACK_TRACE_MARKERS, "")
      .replace(/^[\w.]+(?:Exception|Error):\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned || TECHNICAL_DETAIL.test(cleaned) || cleaned.length > 240) return [];
    const detailText = comparable(cleaned);
    if (titleText && (detailText === titleText || titleText.includes(detailText) || detailText.includes(titleText))) return [];
    return [cleaned];
  }))].slice(0, 4);
}

export function getUserFacingError(error: unknown, fallback?: Partial<UserFacingError>): UserFacingError {
  const axiosError = axios.isAxiosError(error) ? error : null;
  const status =
    (typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined) ||
    axiosError?.response?.status;
  const statusFallback = fallbackForStatus(status);

  const isLoginRequest = axiosError?.config?.url?.includes("/auth/login");
  if (status === 401 && isLoginRequest) {
    return { title: "Sign-in failed", description: "Check your username and password, then try again." };
  }

  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  const networkFailure = axiosError?.code === "ERR_NETWORK" || (!status && /network|fetch/i.test(rawMessage ?? ""));
  if (networkFailure) {
    return {
      title: "Cannot connect to the server",
      description: "Check your network connection and make sure the POS server is running, then try again.",
    };
  }

  return {
    title: isUsefulMessage(rawMessage)
      ? rawMessage!.trim()
      : fallback?.title || statusFallback?.title || "We could not complete that action",
    description:
      fallback?.description ||
      statusFallback?.description ||
      "Please try again. If the problem continues, contact support with the action you were performing.",
  };
}
