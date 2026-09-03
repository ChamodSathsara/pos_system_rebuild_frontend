import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return new Response("Invalid request origin.", { status: 403 });
  }

  const privateKeyPath = process.env.QZ_PRIVATE_KEY_PATH;
  if (!privateKeyPath) return new Response("QZ private key path is not configured.", { status: 500 });

  const payload = await request.text();
  if (!payload || payload.length > 100_000) return new Response("Invalid signing payload.", { status: 400 });

  try {
    const privateKey = await readFile(privateKeyPath, "utf8");
    const signer = createSign("SHA512");
    signer.update(payload, "utf8");
    signer.end();
    return new Response(signer.sign(privateKey, "base64"), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("QZ signature could not be created.", { status: 500 });
  }
}
