import Link from "next/link";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Trackers | LLM-Docs",
  description: "Track release histories, provider activity, and change timelines across the AI ecosystem.",
  path: "/trackers",
});

export default function TrackersPage() {
  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Trackers</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Change tracking and release history</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          Follow what changed over time across models, providers, and the broader ecosystem.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/trackers/releases" className="surface-card space-y-3 transition hover:border-white/16">
          <h2 className="text-2xl font-semibold text-slate-50">Release tracker</h2>
          <p className="text-sm leading-6 text-slate-300">Timeline view of model launches and AI news changes.</p>
        </Link>
        <Link href="/providers" className="surface-card space-y-3 transition hover:border-white/16">
          <h2 className="text-2xl font-semibold text-slate-50">Provider hubs</h2>
          <p className="text-sm leading-6 text-slate-300">Provider-specific pages for OpenAI, Anthropic, Google, and related ecosystems.</p>
        </Link>
      </div>
    </section>
  );
}
