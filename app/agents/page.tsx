import AgentExplorer from "@/components/explore/AgentExplorer";
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

      <AgentExplorer agents={agents} />
    </section>
  );
}
