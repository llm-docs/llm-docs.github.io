import Link from "next/link";
import { getModels } from "@/lib/content";
import ModelExplorer from "@/components/explore/ModelExplorer";
import { rankModels } from "@/lib/model-ranking";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Models | IntuiVortex",
  description: "Track language models, releases, context windows, and provider updates.",
  path: "/models",
});

export default async function ModelsIndexPage() {
  const models = await getModels();
  const rankedModels = rankModels(models);
  const leaderboard = rankedModels.filter((model) => model.ranking.eligible).slice(0, 12);

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Models</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Model tracker</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Track leading models by provider, capabilities, release history, and practical use cases.
        </p>
      </header>

      <section className="hero-shell space-y-8 px-6 py-10 sm:px-8">
        <div className="space-y-4">
          <p className="eyebrow text-white/80">New Ranking Method</p>
          <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Traceable Capability Density ranks LLMs by how complete, current, and operationally legible they are.
          </h2>
          <p className="max-w-4xl text-base leading-8 text-slate-200">
            Instead of chasing one benchmark, IntuiVortex uses a bespoke metric that rewards five things at once:
            concrete model identity, specification depth, workload reach, release freshness, and deployment confidence.
            The result is a conference-style grade system built for serious model tracking rather than hype cycles.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <MetricCard title="Identity Precision" score="20" description="Rewards entries that clearly name a real model family or checkpoint instead of a generic article or use-case page." />
          <MetricCard title="Specification Depth" score="25" description="Counts structured signals such as context window, modalities, pricing, tags, and use-case coverage." />
          <MetricCard title="Workload Reach" score="20" description="Measures how much practical surface area the model exposes across modality support, context scale, and workload breadth." />
          <MetricCard title="Temporal Momentum" score="15" description="Gives more credit to recent releases so the ranking stays tied to the current frontier." />
          <MetricCard title="Deployment Confidence" score="20" description="Rewards active, clearly tracked entries and penalizes weak or auto-detected records with thin operational detail." />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr,1.8fr]">
          <div className="surface-card space-y-4 bg-[rgba(4,8,20,0.35)]">
            <h3 className="text-xl font-semibold text-slate-50">Conference-style grades</h3>
            <div className="space-y-3 text-sm leading-7 text-slate-300">
              <p><span className="font-semibold text-white">A*</span>: exceptional across almost every tracked signal; clear model identity, high metadata depth, and strong operational clarity.</p>
              <p><span className="font-semibold text-white">A</span>: strong and credible, with only one weaker area preventing top-tier status.</p>
              <p><span className="font-semibold text-white">B</span>: useful model entry, but not yet elite on clarity, breadth, or deployment evidence.</p>
              <p><span className="font-semibold text-white">C</span>: low-confidence or thinly specified entry; present in tracking, but not yet strong enough for serious ranking trust.</p>
            </div>
          </div>

          <div className="surface-card space-y-4 bg-[rgba(4,8,20,0.35)]">
            <h3 className="text-xl font-semibold text-slate-50">How the metric works</h3>
            <p className="text-sm leading-7 text-slate-300">
              The page computes a 100-point score for each tracked entry. High scores come from being a clearly named model
              with rich specs and current release signals. Weak scores usually mean the entry behaves more like a generic announcement,
              workflow guide, or topic page than a properly specified LLM profile. That keeps the leaderboard from confusing content noise with model quality.
            </p>
            <p className="text-sm leading-7 text-slate-300">
              This is intentionally not a raw intelligence benchmark. It is a structured ranking of model seriousness and traceability:
              the models you can reason about, compare, and operationalize with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Leaderboard</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50">TCD leaderboard</h2>
          </div>
          <p className="text-sm text-slate-400">
            Ranked from the current tracked set. Eligible entries: {leaderboard.length}.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="px-0 py-3">Rank</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">TCD</th>
                <th className="px-4 py-3">Why it lands here</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((model, index) => (
                <tr key={model.slug} className="border-b border-white/6 align-top">
                  <td className="px-0 py-4 font-semibold text-white">{index + 1}</td>
                  <td className="px-4 py-4">
                    <Link href={`/models/${model.slug}`} className="font-semibold text-slate-100 transition hover:text-sky-200">
                      {model.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{model.provider}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                      {model.ranking.grade}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">{model.ranking.score}</td>
                  <td className="px-4 py-4 text-slate-300">{model.ranking.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ModelExplorer models={rankedModels} />
    </section>
  );
}

function MetricCard({
  title,
  score,
  description,
}: {
  title: string;
  score: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[rgba(7,12,28,0.4)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h3>
        <span className="rounded-full border border-white/12 px-2.5 py-1 text-xs font-semibold text-slate-200">/{score}</span>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{description}</p>
    </div>
  );
}
