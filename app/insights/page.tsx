import { HorizontalBarChart, ReleaseTimeline } from "@/components/charts/SimpleCharts";
import { getModels, getProviderHubs, getReleaseTimeline } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Insights | IntuiVortex",
  description: "Interactive charts and ecosystem views for model releases, providers, and context windows.",
  path: "/insights",
});

export default async function InsightsPage() {
  const [timeline, providers, models] = await Promise.all([
    getReleaseTimeline(),
    getProviderHubs(),
    getModels(),
  ]);

  const latestTimeline = timeline.slice(0, 10).map((item) => ({
    label: item.title,
    date: item.date,
    meta: `${item.provider} · ${item.type}`,
  }));

  const providerActivity = providers.slice(0, 8).map((provider) => ({
    label: provider.label,
    value: provider.news.length + provider.models.length,
  }));

  const contextComparison = models
    .filter((model) => model.contextWindow)
    .slice(0, 8)
    .map((model) => ({
      label: model.name,
      value: parseContextWindow(model.contextWindow || ""),
    }))
    .filter((item) => item.value > 0);

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Insights</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Interactive charts and release intelligence</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          Explore release timing, provider activity, and context-window differences with lightweight visual summaries.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Model and news timeline</h2>
          <ReleaseTimeline items={latestTimeline} />
          <p className="text-sm leading-6 text-slate-300">
            This timeline summarizes the most recent model releases and AI updates across the tracked content base.
          </p>
        </section>
        <section className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Provider release activity</h2>
          <HorizontalBarChart data={providerActivity} />
          <p className="text-sm leading-6 text-slate-300">
            Activity combines tracked model pages and recent news volume to show which providers are most active in the current library.
          </p>
        </section>
      </div>

      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-50">Context window comparison</h2>
        <HorizontalBarChart data={contextComparison} />
        <p className="text-sm leading-6 text-slate-300">
          This chart compares declared context windows across model pages. Important details also remain visible as text, not only as bars.
        </p>
      </section>
    </section>
  );
}

function parseContextWindow(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)([kKmM]?)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "m") return amount * 1_000_000;
  if (unit === "k") return amount * 1_000;
  return amount;
}
