import { buildPageMetadata } from "@/lib/metadata";
import { getAutomationStatus } from "@/lib/content";

export const metadata = buildPageMetadata({
  title: "Automation Tracker | LLM-Docs",
  description: "Track hourly sync health and review possible model-launch candidates found by the free automatic discovery system.",
  path: "/trackers/automation",
});

function formatDate(date: string) {
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function AutomationTrackerPage() {
  const automation = await getAutomationStatus();
  const review = automation.modelReview;

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Automation Tracker</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Free automatic source monitoring</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          This tracker shows what the hourly sync checked and which possible model launches were flagged for review without relying on a paid search API.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">News Sources</h2>
          <p className="text-sm leading-6 text-slate-300">
            Last run: {formatDate(automation.news?.lastRunAt || "")}
          </p>
          <div className="space-y-3">
            {(automation.news?.sources || []).map((source) => (
              <div key={source.sourceId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-slate-100">{source.sourceName}</p>
                <p className="mt-2 text-sm text-slate-300">
                  Status: {source.status} · Written: {source.written} · Scanned: {source.scanned || 0}
                </p>
                {source.error ? <p className="mt-2 text-sm text-rose-300">{source.error}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Model Sources</h2>
          <p className="text-sm leading-6 text-slate-300">
            Last run: {formatDate(automation.models?.lastRunAt || "")}
          </p>
          <div className="space-y-3">
            {(automation.models?.sources || []).map((source) => (
              <div key={source.sourceId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-slate-100">{source.sourceName}</p>
                <p className="mt-2 text-sm text-slate-300">
                  Status: {source.status} · Written: {source.written} · Matched: {source.matched || 0} · Scanned: {source.scanned || 0}
                </p>
                {source.error ? <p className="mt-2 text-sm text-rose-300">{source.error}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-50">Possible Misses</h2>
        <p className="text-sm leading-6 text-slate-300">
          Last review run: {formatDate(review?.lastRunAt || "")} · Candidates: {review?.candidateCount || 0}
        </p>

        {review?.candidates?.length ? (
          <div className="grid gap-4">
            {review.candidates.map((candidate) => (
              <a
                key={`${candidate.sourceId}-${candidate.link}`}
                href={candidate.link}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20"
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                  {candidate.sourceName} • {candidate.reason} • {candidate.date || "undated"}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-50">{candidate.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{candidate.description || "No description captured."}</p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-300">No review candidates were flagged in the latest run.</p>
        )}
      </section>
    </section>
  );
}
