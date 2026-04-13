import Link from "next/link";

import { getProviderHubs } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Providers | LLM-Docs",
  description: "Provider ecosystem hubs for OpenAI, Anthropic, Google, and other AI model vendors.",
  path: "/providers",
});

export default async function ProvidersPage() {
  const providers = await getProviderHubs();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Providers</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Provider ecosystem map</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          Explore models, docs, recent news, and comparisons grouped by provider ecosystem.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <Link key={provider.slug} href={`/providers/${provider.slug}`} className="surface-card space-y-3 transition hover:border-white/16">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
              {provider.models.length} models · {provider.news.length} updates
            </p>
            <h2 className="text-2xl font-semibold text-slate-50">{provider.label}</h2>
            <p className="text-sm leading-6 text-slate-300">
              Hub page for models, comparisons, guides, and release activity related to {provider.label}.
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
