"use client";

import { useMemo, useState } from "react";

type AgentItem = {
  slug: string;
  name: string;
  category: string;
  description: string;
  features?: string[];
  useCases?: string[];
};

export default function AgentComparisonExplorer({ agents }: { agents: AgentItem[] }) {
  const [left, setLeft] = useState(agents[0]?.slug ?? "");
  const [right, setRight] = useState(agents[1]?.slug ?? agents[0]?.slug ?? "");

  const leftAgent = useMemo(() => agents.find((agent) => agent.slug === left) ?? null, [agents, left]);
  const rightAgent = useMemo(() => agents.find((agent) => agent.slug === right) ?? null, [agents, right]);

  if (!leftAgent || !rightAgent) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Agent framework comparison</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <select value={left} onChange={(event) => setLeft(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
            {agents.map((agent) => <option key={agent.slug} value={agent.slug}>{agent.name}</option>)}
          </select>
          <select value={right} onChange={(event) => setRight(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
            {agents.map((agent) => <option key={agent.slug} value={agent.slug}>{agent.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[leftAgent, rightAgent].map((agent) => (
          <div key={agent.slug} className="surface-card space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{agent.category}</p>
            <h3 className="text-2xl font-semibold text-slate-50">{agent.name}</h3>
            <p className="text-sm leading-6 text-slate-300">{agent.description}</p>
            <p className="text-sm text-slate-300">Features: {(agent.features || []).join(", ") || "Not set"}</p>
            <p className="text-sm text-slate-300">Use cases: {(agent.useCases || []).join(", ") || "Not set"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
