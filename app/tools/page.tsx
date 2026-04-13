import Link from "next/link";

import { FeedbackLinks } from "@/components/feedback/FeedbackLinks";
import ContextWindowCalculator from "@/components/tools/ContextWindowCalculator";
import TokenCostCalculator from "@/components/tools/TokenCostCalculator";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Tools | IntuiVortex",
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
          Use calculators and hardware guides to estimate cost, context, and real deployment fit before you commit to a model stack.
        </p>
      </header>
      <section className="surface-card space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-50">Deployment estimator</h2>
          <p className="text-sm leading-6 text-slate-300">
            Estimate VRAM, RAM, KV cache, runtime overhead, and likely fit for real hardware profiles.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/calculator" className="button-primary">
            Open calculator
          </Link>
          <Link href="/hardware" className="button-secondary">
            Browse hardware guides
          </Link>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <TokenCostCalculator />
        <ContextWindowCalculator />
      </div>
      <FeedbackLinks context="tools" />
      <div>
        <Link href="/compare" className="text-sky-300 hover:text-sky-200">
          Go to comparison tools
        </Link>
      </div>
    </section>
  );
}
