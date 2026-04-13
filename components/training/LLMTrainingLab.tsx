"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type StageId = "pretraining" | "finetuning" | "inference";
type PrecisionId = "fp16" | "int8" | "q4";

const parameterOptions = [
  { value: 1, label: "1B" },
  { value: 3, label: "3B" },
  { value: 7, label: "7B" },
  { value: 13, label: "13B" },
  { value: 34, label: "34B" },
  { value: 70, label: "70B" },
  { value: 180, label: "180B" },
  { value: 405, label: "405B" },
];

const stageOptions: Array<{
  id: StageId;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "pretraining",
    label: "Pretraining",
    eyebrow: "Stage 1",
    description: "Weights start noisy, gradients are large, and the model is still learning broad language structure.",
  },
  {
    id: "finetuning",
    label: "Fine-tuning",
    eyebrow: "Stage 2",
    description: "The base model is already competent, and updates become narrower, smaller, and more task-specific.",
  },
  {
    id: "inference",
    label: "Inference",
    eyebrow: "Stage 3",
    description: "Weights are frozen. The live cost shifts from training updates to activation flow and KV-cache growth.",
  },
];

const precisionOptions: Array<{ id: PrecisionId; label: string; bytesPerParam: number }> = [
  { id: "fp16", label: "FP16", bytesPerParam: 2 },
  { id: "int8", label: "INT8", bytesPerParam: 1 },
  { id: "q4", label: "Q4", bytesPerParam: 0.5 },
];

export default function LLMTrainingLab() {
  const [stage, setStage] = useState<StageId>("pretraining");
  const [parameterIndex, setParameterIndex] = useState(2);
  const [sequenceLength, setSequenceLength] = useState(4096);
  const [trainingStep, setTrainingStep] = useState(28);
  const [precision, setPrecision] = useState<PrecisionId>("fp16");

  const parameterB = parameterOptions[parameterIndex]?.value ?? 7;
  const precisionSpec = precisionOptions.find((item) => item.id === precision) ?? precisionOptions[0];

  const layers = estimateLayers(parameterB);
  const hiddenSize = estimateHiddenSize(parameterB);
  const heads = Math.max(8, Math.round(hiddenSize / 128));
  const tokensSeenB = stage === "pretraining" ? Math.round(parameterB * 30) : Math.round(parameterB * 3);
  const activeWeightGB = round(parameterB * precisionSpec.bytesPerParam);
  const optimizerGB = stage === "inference" ? 0 : round(parameterB * 8);
  const gradientGB = stage === "inference" ? 0 : round(parameterB * 2);
  const activationGB = round((parameterB * sequenceLength) / 12000);
  const kvCacheGB = stage === "inference" ? round((parameterB * sequenceLength) / 18000) : round((parameterB * sequenceLength) / 42000);
  const totalWorkingSetGB = round(activeWeightGB + optimizerGB + gradientGB + activationGB + kvCacheGB);
  const loss = estimateLoss(stage, trainingStep, parameterB);
  const updateStrength = estimateUpdateStrength(stage, trainingStep);
  const attentionSpread = estimateAttentionSpread(stage, trainingStep);
  const cacheTokens = Math.max(4, Math.min(24, Math.round(sequenceLength / 1536)));
  const memorySegments = [
    { label: "Weights", value: activeWeightGB, color: "bg-sky-400" },
    { label: "Optimizer", value: optimizerGB, color: "bg-amber-400" },
    { label: "Gradients", value: gradientGB, color: "bg-rose-400" },
    { label: "Activations", value: activationGB, color: "bg-emerald-400" },
    { label: "KV cache", value: kvCacheGB, color: "bg-fuchsia-400" },
  ].filter((item) => item.value > 0);
  const computeMix = getComputeMix(stage, trainingStep);
  const parameterDelta = parameterIndex === 0 ? 1 : round(parameterB / parameterOptions[parameterIndex - 1].value);
  const tokenFlow = buildTokenFlow(stage, cacheTokens, attentionSpread);

  const growthCards = parameterOptions.map((option) => {
    const weights = round(option.value * precisionSpec.bytesPerParam);
    const runtime = round(weights + option.value * 0.55);
    const training = round(weights + option.value * 10);
    return {
      label: option.label,
      weights,
      runtime,
      training,
      selected: option.value === parameterB,
    };
  });

  const stageNotes = {
    pretraining: {
      modelState: "Random-to-structured",
      modelText:
        "The network begins with random weights. Each batch nudges billions of values until token prediction becomes statistically useful.",
      primaryCost: "Optimizer state and gradients dominate memory.",
      primaryMechanic: "Backward pass updates almost every trainable weight.",
    },
    finetuning: {
      modelState: "Broad-to-specialized",
      modelText:
        "The base model already knows language. Fine-tuning shifts it toward a narrower behavior, domain, or format contract.",
      primaryCost: "You still pay for activations and updates, but often on fewer tokens and often fewer trainable parameters.",
      primaryMechanic: "Weight deltas become smaller and more targeted.",
    },
    inference: {
      modelState: "Frozen-and-serving",
      modelText:
        "No gradient update happens at inference time. The model only applies the learned weights to incoming tokens and grows a KV cache as context expands.",
      primaryCost: "Weight residency and KV cache dominate runtime memory.",
      primaryMechanic: "Forward pass only, with cache growth tied to context and concurrency.",
    },
  }[stage];

  return (
    <section className="space-y-8">
      <div className="surface-card space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Process map</p>
              <h2 className="text-2xl font-semibold text-slate-50">How tokens move through the lifecycle</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {stageOptions.map((option, index) => {
                const active = option.id === stage;
                const complete = stageOptions.findIndex((item) => item.id === stage) > index;
                return (
                  <div
                    key={option.id}
                    className={`rounded-[1.5rem] border p-4 ${
                      active
                        ? "border-sky-400/50 bg-sky-500/12"
                        : complete
                          ? "border-emerald-400/30 bg-emerald-500/8"
                          : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                          active
                            ? "bg-sky-400 text-slate-950"
                            : complete
                              ? "bg-emerald-400 text-slate-950"
                              : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{option.eyebrow}</p>
                        <h3 className="text-lg font-semibold text-slate-50">{option.label}</h3>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{option.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Parameter jump</p>
              <h2 className="text-2xl font-semibold text-slate-50">{parameterOptions[parameterIndex]?.label} is a physical scale change</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Current size" value={parameterOptions[parameterIndex]?.label ?? "7B"} />
              <MiniStat label="Jump vs previous tier" value={`${parameterDelta}x`} />
              <MiniStat label="Estimated total matrices" value={`${layers} x ${hiddenSize}`} />
              <MiniStat label="Serving precision" value={precisionSpec.label} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Bigger parameter counts mean more learned scalar values, wider hidden states, and usually more layers. The result is not
              abstract growth. It is larger memory residency, heavier matrix multiplies, and bigger training state.
            </p>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Interactive stages</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-50">What an LLM is doing at each phase</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                This is a conceptual simulation, not a literal dump of a production model. It shows how weights, gradients, activations,
                and cache behavior change from pretraining to fine-tuning to inference.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stageOptions.map((option) => {
                const active = option.id === stage;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStage(option.id)}
                    className={`rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-sky-400/50 bg-sky-500/12 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{option.eyebrow}</p>
                    <h3 className="mt-2 text-lg font-semibold">{option.label}</h3>
                    <p className="mt-2 text-sm leading-6">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Model state" value={stageNotes.modelState} text={stageNotes.modelText} />
              <MetricCard label="Primary runtime truth" value={stageNotes.primaryMechanic} text={stageNotes.primaryCost} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(2,6,23,0.8)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Weight field simulation</p>
                <h3 className="text-xl font-semibold text-slate-50">
                  {parameterOptions[parameterIndex]?.label} model · {stageOptions.find((item) => item.id === stage)?.label}
                </h3>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300">
                Step {trainingStep}
              </div>
            </div>

            <div
              className="mt-5 grid gap-1"
              style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}
            >
              {Array.from({ length: 256 }, (_, index) => {
                const intensity = getWeightCell(index, stage, parameterB, trainingStep);
                return (
                  <div
                    key={index}
                    className="aspect-square rounded-[0.35rem]"
                    style={{
                      background: `rgba(${intensity.r}, ${intensity.g}, ${intensity.b}, ${intensity.a})`,
                      boxShadow: intensity.a > 0.75 ? "0 0 14px rgba(56, 189, 248, 0.15)" : "none",
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SignalCard label="Loss" value={String(loss)} helper="Lower is usually better." accent="sky" />
              <SignalCard label="Update strength" value={`${updateStrength}%`} helper="How hard weights are moving." accent="amber" />
              <SignalCard label="Attention spread" value={`${attentionSpread}%`} helper="How broad the active context is." accent="emerald" />
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <Control
            label="Parameter scale"
            value={`${parameterOptions[parameterIndex]?.label} parameters`}
            hint="Moving this slider increases weights, memory residency, and compute pressure."
          >
            <input
              type="range"
              min={0}
              max={parameterOptions.length - 1}
              step={1}
              value={parameterIndex}
              onChange={(event) => setParameterIndex(Number(event.target.value))}
              className="w-full accent-sky-400"
            />
          </Control>

          <Control
            label="Sequence length"
            value={`${sequenceLength.toLocaleString()} tokens`}
            hint="Longer contexts increase activation load and KV cache growth."
          >
            <input
              type="range"
              min={1024}
              max={32768}
              step={1024}
              value={sequenceLength}
              onChange={(event) => setSequenceLength(Number(event.target.value))}
              className="w-full accent-sky-400"
            />
          </Control>

          <Control
            label="Training progress"
            value={`${trainingStep}%`}
            hint="Earlier steps look noisy; later steps look more structured."
          >
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={trainingStep}
              onChange={(event) => setTrainingStep(Number(event.target.value))}
              className="w-full accent-sky-400"
            />
          </Control>

          <Control
            label="Weight precision"
            value={precisionSpec.label}
            hint="Precision changes how large the model feels in memory at inference time."
          >
            <div className="flex flex-wrap gap-2">
              {precisionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPrecision(option.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    option.id === precision
                      ? "border-sky-400/50 bg-sky-500/12 text-sky-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Control>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ValueTile label="Estimated layers" value={String(layers)} helper="A rough scaling proxy." />
          <ValueTile label="Hidden size" value={hiddenSize.toLocaleString()} helper="Wider models carry larger matrices." />
          <ValueTile label="Attention heads" value={String(heads)} helper="More heads raise attention routing capacity." />
          <ValueTile label="Weights in memory" value={`${activeWeightGB} GB`} helper={`${precisionSpec.label} residency only.`} />
          <ValueTile label="Training-only state" value={`${round(optimizerGB + gradientGB)} GB`} helper="Optimizer + gradients." />
          <ValueTile label="Current working set" value={`${totalWorkingSetGB} GB`} helper="Weights + activations + cache + updates." />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Memory composition</p>
              <h2 className="text-2xl font-semibold text-slate-50">What occupies memory right now</h2>
            </div>
            <div className="mt-5 h-5 overflow-hidden rounded-full bg-white/8">
              <div className="flex h-full w-full">
                {memorySegments.map((segment) => (
                  <div
                    key={segment.label}
                    className={segment.color}
                    style={{ width: `${(segment.value / Math.max(totalWorkingSetGB, 1)) * 100}%` }}
                    title={`${segment.label}: ${segment.value} GB`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {memorySegments.map((segment) => (
                <LegendRow
                  key={segment.label}
                  color={segment.color}
                  label={segment.label}
                  value={`${segment.value} GB`}
                  share={`${round((segment.value / Math.max(totalWorkingSetGB, 1)) * 100)}%`}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Compute mix</p>
              <h2 className="text-2xl font-semibold text-slate-50">Which operation dominates</h2>
            </div>
            <div className="mt-5 space-y-3">
              {computeMix.map((item) => (
                <GrowthBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  ceiling={100}
                  color={item.color}
                />
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Pretraining spends more effort on backpropagation and optimizer updates. Inference drops those entirely and shifts the
              runtime burden toward forward compute plus cache management.
            </p>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="surface-card space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Parameter growth</p>
            <h2 className="text-2xl font-semibold text-slate-50">How bigger models physically change</h2>
            <p className="text-sm leading-6 text-slate-300">
              As parameter count rises, you are not just getting “more intelligence.” You are increasing weight memory, optimizer state,
              training throughput requirements, and often the minimum useful hardware envelope.
            </p>
          </div>

          <div className="space-y-4">
            {growthCards.map((item) => (
              <div
                key={item.label}
                className={`rounded-3xl border p-4 transition ${
                  item.selected ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-50">{item.label}</h3>
                  <span className="text-sm text-slate-300">{item.weights} GB weights</span>
                </div>
                <div className="mt-3 space-y-2">
                  <GrowthBar label="Inference footprint" value={item.runtime} ceiling={growthCards[growthCards.length - 1]?.training || 1} color="bg-sky-400" />
                  <GrowthBar label="Training footprint" value={item.training} ceiling={growthCards[growthCards.length - 1]?.training || 1} color="bg-amber-400" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Token flow</p>
              <h3 className="text-xl font-semibold text-slate-50">What the model sees token by token</h3>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tokenFlow.map((token) => (
                <div
                  key={token.id}
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    token.kind === "input"
                      ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
                      : token.kind === "cache"
                        ? "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {token.label}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Visible tokens" value={String(tokenFlow.filter((item) => item.kind !== "generated").length)} />
              <MiniStat label="Generated token" value={tokenFlow[tokenFlow.length - 1]?.label ?? "T+1"} />
              <MiniStat label="Cache growth feel" value={stage === "inference" ? "Fast" : "Moderate"} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Live explanation</p>
            <h2 className="text-2xl font-semibold text-slate-50">What changes between stages</h2>
          </div>

          <div className="space-y-3">
            <ExplanationRow
              label="Pretraining"
              text={`At ${parameterB}B parameters, pretraining usually means huge token volume, large optimizer state, and a network that is still learning generic statistical structure. Approximate data exposure here: ${tokensSeenB}B tokens.`}
            />
            <ExplanationRow
              label="Fine-tuning"
              text={`Fine-tuning does not rebuild the model from zero. It nudges the existing weights toward a narrower behavior. The model already has broad language priors, so the update field becomes more targeted.`}
            />
            <ExplanationRow
              label="Inference"
              text={`Inference freezes the weights. The model size still matters because those weights must stay resident, but now the fast-growing object is the KV cache, which expands with context length and concurrency.`}
            />
            <ExplanationRow
              label="Parameters"
              text={`A “parameter” is just a learned scalar in the network. When you move from 7B to 70B, you are scaling the number of learned values by 10x, which often pushes training state and serving memory up by similar orders of magnitude.`}
            />
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current estimate</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Token exposure" value={`${tokensSeenB}B`} />
              <MiniStat label="Activation load" value={`${activationGB} GB`} />
              <MiniStat label="KV cache" value={`${kvCacheGB} GB`} />
              <MiniStat label="Trainable update load" value={stage === "inference" ? "Frozen" : `${round(optimizerGB + gradientGB)} GB`} />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function Control({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-50">{value}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{hint}</p>
    </div>
  );
}

function MetricCard({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-50">{value}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function SignalCard({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  accent: "sky" | "amber" | "emerald";
}) {
  const accentClass = {
    sky: "text-sky-200 border-sky-400/30 bg-sky-500/10",
    amber: "text-amber-200 border-amber-400/30 bg-amber-500/10",
    emerald: "text-emerald-200 border-emerald-400/30 bg-emerald-500/10",
  }[accent];

  return (
    <div className={`rounded-[1.25rem] border p-3 ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-300">{helper}</p>
    </div>
  );
}

function ValueTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{helper}</p>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  share,
}: {
  color: string;
  label: string;
  value: string;
  share: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>{share}</span>
        <span className="text-slate-100">{value}</span>
      </div>
    </div>
  );
}

function GrowthBar({
  label,
  value,
  ceiling,
  color,
}: {
  label: string;
  value: number;
  ceiling: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
        <span>{label}</span>
        <span>{value} GB</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/8">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / Math.max(ceiling, 1)) * 100}%` }} />
      </div>
    </div>
  );
}

function ExplanationRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function estimateLayers(parameterB: number) {
  return Math.max(16, Math.round(18 + Math.log2(parameterB + 1) * 10));
}

function estimateHiddenSize(parameterB: number) {
  const raw = 1024 + Math.sqrt(parameterB) * 1100;
  return Math.round(raw / 64) * 64;
}

function estimateLoss(stage: StageId, progress: number, parameterB: number) {
  const stageBase = {
    pretraining: 5.6,
    finetuning: 2.1,
    inference: 1.0,
  }[stage];
  const reduction = progress * (stage === "pretraining" ? 0.03 : 0.012);
  const parameterLift = Math.log10(parameterB + 1) * 0.24;
  return round(Math.max(stage === "inference" ? 1 : 0.85, stageBase - reduction - parameterLift));
}

function estimateUpdateStrength(stage: StageId, progress: number) {
  const base = {
    pretraining: 82,
    finetuning: 48,
    inference: 0,
  }[stage];
  const decay = progress * (stage === "pretraining" ? 0.45 : 0.28);
  return Math.max(stage === "inference" ? 0 : 6, Math.round(base - decay));
}

function estimateAttentionSpread(stage: StageId, progress: number) {
  const base = {
    pretraining: 32,
    finetuning: 61,
    inference: 84,
  }[stage];
  const modifier = Math.round(progress * 0.18);
  return Math.min(96, base + modifier);
}

function getWeightCell(index: number, stage: StageId, parameterB: number, step: number) {
  const x = index % 16;
  const y = Math.floor(index / 16);
  const seed = Math.sin((x + 1) * 1.37 + (y + 1) * 2.11 + parameterB * 0.31 + step * 0.07);
  const magnitude = Math.abs(seed);

  if (stage === "pretraining") {
    return {
      r: Math.round(20 + magnitude * 90),
      g: Math.round(80 + magnitude * 100),
      b: Math.round(180 + magnitude * 50),
      a: 0.24 + magnitude * 0.68,
    };
  }

  if (stage === "finetuning") {
    return {
      r: Math.round(160 + magnitude * 60),
      g: Math.round(80 + magnitude * 80),
      b: Math.round(60 + magnitude * 120),
      a: 0.2 + magnitude * 0.62,
    };
  }

  return {
    r: Math.round(70 + magnitude * 50),
    g: Math.round(190 + magnitude * 40),
    b: Math.round(150 + magnitude * 55),
    a: 0.28 + magnitude * 0.58,
  };
}

function getComputeMix(stage: StageId, progress: number) {
  if (stage === "pretraining") {
    return [
      { label: "Forward pass", value: Math.max(18, 34 - Math.round(progress * 0.08)), color: "bg-sky-400" },
      { label: "Backward pass", value: Math.min(46, 34 + Math.round(progress * 0.06)), color: "bg-amber-400" },
      { label: "Optimizer update", value: 100 - (Math.max(18, 34 - Math.round(progress * 0.08)) + Math.min(46, 34 + Math.round(progress * 0.06))), color: "bg-rose-400" },
    ];
  }

  if (stage === "finetuning") {
    return [
      { label: "Forward pass", value: 41, color: "bg-sky-400" },
      { label: "Backward pass", value: 36, color: "bg-amber-400" },
      { label: "Optimizer update", value: 23, color: "bg-rose-400" },
    ];
  }

  return [
    { label: "Forward pass", value: 68, color: "bg-sky-400" },
    { label: "KV cache reads/writes", value: 22, color: "bg-fuchsia-400" },
    { label: "Sampling/output logic", value: 10, color: "bg-emerald-400" },
  ];
}

function buildTokenFlow(stage: StageId, cacheTokens: number, attentionSpread: number) {
  const visible = Math.max(6, Math.min(cacheTokens, 16));
  const items: Array<{ id: string; label: string; kind: "input" | "cache" | "generated" }> = [];

  for (let index = 0; index < visible; index += 1) {
    items.push({
      id: `input-${index}`,
      label: `t${index + 1}`,
      kind: stage === "inference" && index < visible - 2 ? "cache" : "input",
    });
  }

  items.push({
    id: "generated",
    label: attentionSpread > 75 ? "next token*" : "candidate",
    kind: "generated",
  });

  return items;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
