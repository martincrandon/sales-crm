export default function Loading() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <p className="caption-style text-subtle">Loading your private workspace…</p>
    </main>
  );
}
