import LLMTrainingLab from "@/components/training/LLMTrainingLab";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "LLM Training Lab | LLM-Docs",
  description:
    "Interactive simulation of LLM pretraining, fine-tuning, inference, weight behavior, KV-cache growth, and parameter scaling.",
  path: "/training",
});

export default function TrainingPage() {
  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Training Lab</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">
          See how an LLM changes during training, fine-tuning, and inference
        </h1>
        <p className="max-w-4xl text-lg leading-8 text-slate-300">
          Explore a visual simulation of weight fields, optimizer state, activations, KV cache growth, and parameter scaling.
          The goal is to make the mechanics legible: what the network is storing, what changes during updates, and why bigger models
          physically cost more to train and serve.
        </p>
      </header>

      <LLMTrainingLab />
    </section>
  );
}
