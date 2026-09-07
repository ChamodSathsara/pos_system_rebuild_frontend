"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 460, padding: 32, textAlign: "center", background: "white", border: "1px solid #e2e8f0", borderRadius: 16 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Vantage POS could not start correctly</h1>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              No transaction was completed by this error. Try restarting the screen; contact support if it happens again.
            </p>
            {error.digest && <p style={{ color: "#64748b", fontSize: 12 }}>Support reference: {error.digest}</p>}
            <button onClick={reset} style={{ border: 0, borderRadius: 8, padding: "10px 16px", background: "#0f172a", color: "white", cursor: "pointer" }}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
