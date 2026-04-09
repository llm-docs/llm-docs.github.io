"use client";

import { useMemo, useState } from "react";

type ModelItem = {
  slug: string;
  name: string;
  provider: string;
  description: string;
  status: string;
  contextWindow?: string;
  modalities?: string[];
  pricing?: string;
  useCases?: string[];
};

export default function ModelComparisonExplorer({ models }: { models: ModelItem[] }) {
  const [selected, setSelected] = useState<string[]>(models.slice(0, 2).map((model) => model.slug));
  const selectedModels = useMemo(
    () => models.filter((model) => selected.includes(model.slug)).slice(0, 3),
    [models, selected],
  );

  function toggle(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) {
        return current.filter((item) => item !== slug);
      }

      if (current.length >= 3) {
        return [...current.slice(1), slug];
      }

      return [...current, slug];
    });
  }

  const csv = useMemo(() => {
    const headers = ["Name", "Provider", "Status", "Context Window", "Modalities", "Pricing", "Use Cases"];
    const rows = selectedModels.map((model) => [
      model.name,
      model.provider,
      model.status,
      model.contextWindow || "",
      (model.modalities || []).join(", "),
      model.pricing || "",
      (model.useCases || []).join(", "),
    ]);

    return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  }, [selectedModels]);

  const comparisonRows: Array<{
    label: string;
    getValue: (model: ModelItem) => string;
  }> = [
    { label: "Provider", getValue: (model) => model.provider },
    { label: "Status", getValue: (model) => model.status },
    { label: "Context Window", getValue: (model) => model.contextWindow || "Not set" },
    { label: "Modalities", getValue: (model) => (model.modalities || []).join(", ") || "Not set" },
    { label: "Pricing", getValue: (model) => model.pricing || "Not set" },
    { label: "Use Cases", getValue: (model) => (model.useCases || []).join(", ") || "Not set" },
  ];

  return (
    <section className="space-y-6">
      <div className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Interactive model comparison</h2>
        <p className="text-sm leading-6 text-slate-300">
          Select up to three models to compare side by side across provider, context window, modalities, pricing, and use cases.
        </p>
        <div className="flex flex-wrap gap-2">
          {models.map((model) => {
            const active = selected.includes(model.slug);
            return (
              <button
                key={model.slug}
                type="button"
                onClick={() => toggle(model.slug)}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  active
                    ? "border-sky-400 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {model.name}
              </button>
            );
          })}
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="llm-docs-model-comparison.csv"
          className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Download comparison CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-[1.5rem] border border-white/8 bg-[rgba(9,15,32,0.78)]">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em] text-slate-400">Field</th>
              {selectedModels.map((model) => (
                <th key={model.slug} className="px-4 py-3 text-left text-sm font-semibold text-slate-50">
                  {model.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.label} className="border-b border-white/8 last:border-b-0">
                <td className="px-4 py-3 text-sm font-medium text-slate-300">{row.label}</td>
                {selectedModels.map((model) => (
                  <td key={`${row.label}-${model.slug}`} className="px-4 py-3 text-sm text-slate-200">
                    {row.getValue(model)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function escapeCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
