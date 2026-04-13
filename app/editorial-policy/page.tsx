export const metadata = {
  title: "Editorial Policy",
  description: "Editorial standards and update policy for IntuiVortex.",
};

export default function EditorialPolicyPage() {
  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Editorial Policy</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Editorial Policy</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          IntuiVortex combines manually curated content with automated feed ingestion for timely publication.
        </p>
      </header>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
        <p>Automated items are used to improve freshness, but they may require manual review and enrichment for deeper analysis, benchmarks, or pricing context.</p>
        <p>Comparison pages and structured summaries are intended to add context rather than simply mirror source headlines.</p>
        <p>When possible, original publishers and primary sources are linked directly.</p>
      </section>
    </article>
  );
}
