import { HorizontalBarChart, ReleaseTimeline } from "@/components/charts/SimpleCharts";
import { EmbedSnippet } from "@/components/feedback/EmbedSnippet";
import { buildPageMetadata } from "@/lib/metadata";
import { getReleaseTimeline } from "@/lib/content";

export const metadata = buildPageMetadata({
  title: "Release Tracker | IntuiVortex",
  description: "Track LLM release history, provider activity, and major ecosystem changes over time.",
  path: "/trackers/releases",
});

export default async function ReleaseTrackerPage() {
  const items = await getReleaseTimeline();
  const csv = [
    ["type", "title", "date", "provider", "href"],
    ...items.map((item) => [item.type, item.title, item.date, item.provider, item.href]),
  ]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const providerCounts = Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      acc[item.provider] = (acc[item.provider] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Release Tracker</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Model and ecosystem change tracker</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          Review model release history, update cadence, and provider activity in one place.
        </p>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="intuivortex-release-tracker.csv"
          className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Download tracker CSV
        </a>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Timeline</h2>
          <ReleaseTimeline items={items.slice(0, 14).map((item) => ({ label: item.title, date: item.date, meta: `${item.provider} · ${item.type}` }))} />
          <p className="text-sm leading-6 text-slate-300">
            This plain-text timeline stays readable on mobile and preserves the important information outside the visualization.
          </p>
        </section>
        <section className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Provider activity</h2>
          <HorizontalBarChart data={providerCounts} />
          <p className="text-sm leading-6 text-slate-300">
            Provider activity is based on tracked release and update items currently indexed by the site.
          </p>
        </section>
      </div>
      <EmbedSnippet src="https://intuivortex.github.io/trackers/releases" title="IntuiVortex release tracker" />
    </section>
  );
}
