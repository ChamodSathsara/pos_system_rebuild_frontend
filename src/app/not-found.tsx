import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold">This page is not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be outdated or the page may have moved. Return to the dashboard to continue working.
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
