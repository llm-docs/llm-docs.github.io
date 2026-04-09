import Link from "next/link";

import { FeedbackLinks } from "@/components/feedback/FeedbackLinks";
import ContextWindowCalculator from "@/components/tools/ContextWindowCalculator";
import TokenCostCalculator from "@/components/tools/TokenCostCalculator";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Tools | LLM-Docs",
  description: "LLM utilities including token cost estimation and context-window planning.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Tools</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Utilities for AI model planning</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          These utility pages add practical value beyond content browsing and are designed to be linkable, reusable resources.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <TokenCostCalculator />
        <ContextWindowCalculator />
      </div>
      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-50">More utilities coming next</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Model pricing estimator",
            "Prompt budget calculator",
            "RAG chunking helper",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-sm text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </section>
      <FeedbackLinks context="tools" />
      <div>
        <Link href="/compare" className="text-sky-300 hover:text-sky-200">
          Go to comparison tools
        </Link>
      </div>
    </section>
  );
}
