import axios from "axios";
import { ApiError, cleanParams, httpClient } from "@/lib/api/client";

export type ReportFormat = "pdf" | "excel";

async function readBlobError(blob: Blob, fallback: string) {
  const body = await blob.text();
  try {
    const parsed = JSON.parse(body) as { message?: string; errors?: string[] };
    return parsed.message || parsed.errors?.join(" ") || fallback;
  } catch {
    return body.trim() || fallback;
  }
}

export async function downloadReport(
  endpoint: string,
  params: Record<string, unknown>,
  format: ReportFormat,
  fileName: string
) {
  try {
    const response = await httpClient.get<Blob>(endpoint, {
      params: cleanParams(params),
      responseType: "blob",
    });
    const mimeType = format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const extension = format === "pdf" ? "pdf" : "xlsx";
    const blob = new Blob([response.data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const fallback = status === 403 ? "Access denied: you do not have permission to download this report." : "Could not download the report.";
      const data = error.response?.data;
      const message = data instanceof Blob ? await readBlobError(data, fallback) : fallback;
      throw new ApiError(message, status);
    }
    throw error;
  }
}
