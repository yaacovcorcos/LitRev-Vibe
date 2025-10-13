export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-10 text-center">
      <div className="text-sm uppercase tracking-wide text-neutral-500">LitRev-Vibe</div>
      <h1 className="max-w-2xl text-balance text-4xl font-semibold text-neutral-900 md:text-5xl">
        Parent MVP workspace scaffolding is ready for the next milestones.
      </h1>
      <p className="max-w-xl text-neutral-600">
        Build the guided research planning, triage, ledger, and drafting flows on top of this shared shell.
      </p>
    </main>
  );
}
