import DeploymentCalculator from "@/components/calculator/DeploymentCalculator";
import { deploymentModels } from "@/data/deployment-models";
import { hardwareProfiles } from "@/data/hardware-profiles";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Deployment Calculator | LLM-Docs",
  description: "Estimate VRAM, RAM, KV cache, fit status, and speed for running LLMs on real hardware.",
  path: "/calculator",
});

export default function CalculatorPage() {
  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Calculator</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Can this model run on your machine?</h1>
        <p className="max-w-4xl text-lg leading-8 text-slate-300">
          Estimate model weight memory, KV cache growth, runtime overhead, CPU offload, and expected fit before you spend time on a deployment that was never going to work.
        </p>
      </header>

      <DeploymentCalculator models={deploymentModels} hardwareProfiles={hardwareProfiles} />
    </section>
  );
}
