"use client";

import Link from "next/link";
import { useState } from "react";

import {
  backendLabels,
  estimateDeployment,
  getAlternativeModelSuggestions,
  getPreferredBackend,
  getQuantizationTable,
} from "@/lib/deployment";
import type {
  BackendId,
  DeploymentModelProfile,
  DeploymentWorkloadId,
  HardwareProfile,
  QuantizationId,
} from "@/types";

const workloadOptions: Array<{ id: DeploymentWorkloadId; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "rag", label: "RAG" },
  { id: "coding", label: "Coding" },
  { id: "long-context", label: "Long context" },
  { id: "vision", label: "Vision" },
];

function fitTierClasses(fitTier: string) {
  return {
    no: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    barely: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    yes: "border-sky-400/40 bg-sky-500/10 text-sky-200",
    comfortable: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  }[fitTier] || "border-white/10 bg-white/5 text-slate-200";
}

export default function DeploymentCalculator({
  models,
  hardwareProfiles,
}: {
  models: DeploymentModelProfile[];
  hardwareProfiles: HardwareProfile[];
}) {
  const [modelSlug, setModelSlug] = useState(models[0]?.slug ?? "");
  const [hardwareSlug, setHardwareSlug] = useState(hardwareProfiles[0]?.slug ?? "");
  const [quantization, setQuantization] = useState<QuantizationId>("q4");
  const [backend, setBackend] = useState<BackendId>(getPreferredBackend(hardwareProfiles[0]));
  const [contextTokens, setContextTokens] = useState(8192);
  const [concurrency, setConcurrency] = useState(1);
  const [workload, setWorkload] = useState<DeploymentWorkloadId>("chat");

  const model = models.find((item) => item.slug === modelSlug) ?? models[0];
  const hardware = hardwareProfiles.find((item) => item.slug === hardwareSlug) ?? hardwareProfiles[0];

  if (!model || !hardware) {
    return null;
  }

  const effectiveQuantization = model.quantizations.includes(quantization) ? quantization : model.quantizations[0];
  const allowedBackends = hardware.backendSupport.filter((id) => model.recommendedBackends.includes(id));
  const backendOptions = allowedBackends.length ? allowedBackends : [getPreferredBackend(hardware)];
  const effectiveBackend = backendOptions.includes(backend) ? backend : backendOptions[0];

  const estimate = estimateDeployment({
    model,
    hardware,
    quantization: effectiveQuantization,
    contextTokens,
    concurrency,
    backend: effectiveBackend,
    workload,
  });
  const quantizationTable = getQuantizationTable(model);
  const alternatives = getAlternativeModelSuggestions({
    currentModel: model,
    hardware,
    quantization: effectiveQuantization,
    contextTokens,
    concurrency,
    backend: effectiveBackend,
    workload,
  });

  return (
    <section className="space-y-8">
      <div className="surface-card grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Model</span>
          <select
            value={model.slug}
            onChange={(event) => {
              const nextModel = models.find((item) => item.slug === event.target.value) ?? models[0];
              setModelSlug(nextModel.slug);
              if (!nextModel.quantizations.includes(effectiveQuantization)) {
                setQuantization(nextModel.quantizations[0]);
              }
              if (contextTokens > nextModel.contextMax) {
                setContextTokens(Math.min(nextModel.contextMax, 32768));
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          >
            {models.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Hardware</span>
          <select
            value={hardware.slug}
            onChange={(event) => {
              const nextHardware = hardwareProfiles.find((item) => item.slug === event.target.value) ?? hardwareProfiles[0];
              setHardwareSlug(nextHardware.slug);
              setBackend(getPreferredBackend(nextHardware));
            }}
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          >
            {hardwareProfiles.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Quantization</span>
          <select
            value={effectiveQuantization}
            onChange={(event) => setQuantization(event.target.value as QuantizationId)}
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          >
            {model.quantizations.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Runtime</span>
          <select
            value={effectiveBackend}
            onChange={(event) => setBackend(event.target.value as BackendId)}
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          >
            {backendOptions.map((item) => (
              <option key={item} value={item}>
                {backendLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Context tokens</span>
          <input
            type="number"
            min={1024}
            max={model.contextMax}
            step={1024}
            value={contextTokens}
            onChange={(event) =>
              setContextTokens(Math.max(1024, Math.min(model.contextMax, Number(event.target.value) || 1024)))
            }
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Concurrency</span>
          <input
            type="number"
            min={1}
            max={8}
            step={1}
            value={concurrency}
            onChange={(event) => setConcurrency(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Workload</span>
          <select
            value={workload}
            onChange={(event) => setWorkload(event.target.value as DeploymentWorkloadId)}
            className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
          >
            {workloadOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Quick links</span>
          <div className="flex flex-wrap gap-2">
            <Link href={`/hardware/${hardware.slug}`} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
              Hardware guide
            </Link>
            <Link href="/hardware" className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
              All hardware
            </Link>
          </div>
        </div>
      </div>

      <div className="surface-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Fit verdict</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50">
              {model.name} on {hardware.name}
            </h2>
          </div>
          <span className={`rounded-full border px-4 py-2 text-sm font-medium capitalize ${fitTierClasses(estimate.fitTier)}`}>
            {estimate.fitTier}
          </span>
        </div>
        <p className="max-w-4xl text-base leading-7 text-slate-300">{estimate.recommendation}</p>
        {estimate.workloadNote ? <p className="text-sm leading-6 text-amber-200">{estimate.workloadNote}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Weights", `${estimate.weightMemoryGB} GB`],
          ["KV cache", `${estimate.kvCacheGB} GB`],
          ["Runtime overhead", `${estimate.runtimeOverheadGB} GB`],
          ["Total required", `${estimate.totalRequiredGB} GB`],
          [
            hardware.type === "cpu" ? "Usable RAM budget" : "Usable accelerator budget",
            `${estimate.availableAcceleratorMemoryGB} GB`,
          ],
          ["System RAM budget", `${estimate.availableSystemMemoryGB} GB`],
        ].map(([label, value]) => (
          <div key={label} className="surface-card space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="text-2xl font-semibold text-slate-50">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="surface-card space-y-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold text-slate-50">Operational breakdown</h3>
            <p className="text-sm leading-6 text-slate-300">
              These numbers are estimates, not promises. They assume one active loaded model and the selected context and concurrency.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {[
                  ["Selected backend", backendLabels[effectiveBackend]],
                  ["Estimated throughput", estimate.estimatedTokensPerSecondRange],
                  ["Performance tier", estimate.performanceTier],
                  ["CPU offload", estimate.needsOffload ? `${estimate.offloadGB} GB likely` : "Not expected"],
                  ["Backend note", estimate.backendNote],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-white/8 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-slate-300">{label}</td>
                    <td className="py-3 text-slate-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.55)] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Assumptions</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              {estimate.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="surface-card space-y-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold text-slate-50">Weight-only memory by quantization</h3>
            <p className="text-sm leading-6 text-slate-300">
              This table excludes KV cache and runtime overhead, so it is only the starting point for fit planning.
            </p>
          </div>
          <div className="space-y-3">
            {quantizationTable.map((row) => (
              <div key={row.quantization} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.55)] px-4 py-3">
                <span className="font-medium text-slate-100">{row.label}</span>
                <span className="text-sm text-slate-300">{row.weightMemoryGB} GB</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface-card space-y-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold text-slate-50">Better fits on this machine</h3>
          <p className="text-sm leading-6 text-slate-300">
            If the current setup is too tight, these are the nearest models that score better on the selected hardware and runtime.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {alternatives.map(({ model: alternative, estimate: alternativeEstimate }) => (
            <div key={alternative.id} className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.55)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-50">{alternative.name}</p>
                <span className={`rounded-full border px-2 py-1 text-xs capitalize ${fitTierClasses(alternativeEstimate.fitTier)}`}>
                  {alternativeEstimate.fitTier}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{alternative.provider}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {alternativeEstimate.totalRequiredGB} GB total, {alternativeEstimate.estimatedTokensPerSecondRange}
              </p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
