import Link from "next/link";

export function FeedbackLinks({ context }: { context: string }) {
  const base = "https://github.com/LLM-Docs/LLM-Docs.github.io/issues/new";
  const suggest = `${base}?title=${encodeURIComponent(`Update suggestion: ${context}`)}`;
  const compare = `${base}?title=${encodeURIComponent(`Comparison request: ${context}`)}`;
  const report = `${base}?title=${encodeURIComponent(`Outdated information: ${context}`)}`;

  return (
    <section className="surface-card space-y-4">
      <h2 className="text-2xl font-semibold text-slate-50">Feedback and requests</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Link href={suggest} className="rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-sm text-slate-300 transition hover:border-white/16 hover:text-white">
          Suggest an update
        </Link>
        <Link href={compare} className="rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-sm text-slate-300 transition hover:border-white/16 hover:text-white">
          Request a comparison
        </Link>
        <Link href={report} className="rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-sm text-slate-300 transition hover:border-white/16 hover:text-white">
          Report outdated info
        </Link>
      </div>
    </section>
  );
}
