import { readFile } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const certificatePath = process.env.QZ_CERTIFICATE_PATH;
  if (!certificatePath) return new Response("QZ certificate path is not configured.", { status: 500 });

  try {
    const certificate = await readFile(certificatePath, "utf8");
    return new Response(certificate, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("QZ certificate could not be loaded.", { status: 500 });
  }
}
