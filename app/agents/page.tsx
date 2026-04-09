import Link from "next/link";

import { getAgents } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Agents | LLM-Docs",
  description: "Agent frameworks, orchestration tools, and related implementation references.",
  path: "/agents",
});

export default async function AgentsIndexPage() {
  const agents = await getAgents();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Agents</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Agent framework directory</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Keep orchestration tools in a separate markdown collection so they can evolve independently from docs and updates.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {agents.map((agent) => (
          <Link key={agent.slug} href={`/agents/${agent.slug}`} className="surface-card group space-y-3 transition hover:-translate-y-0.5 hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{agent.category}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50 group-hover:text-sky-200">
              {agent.name}
            </h2>
            <p className="text-sm leading-6 text-slate-300">{agent.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
