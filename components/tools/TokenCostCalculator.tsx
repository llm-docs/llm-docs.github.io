"use client";

import { useMemo, useState } from "react";

export default function TokenCostCalculator() {
  const [inputTokens, setInputTokens] = useState(10000);
  const [outputTokens, setOutputTokens] = useState(4000);
  const [inputRate, setInputRate] = useState(5);
  const [outputRate, setOutputRate] = useState(15);

  const total = useMemo(() => {
    return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
  }, [inputRate, inputTokens, outputRate, outputTokens]);

  return (
    <div className="surface-card space-y-4">
      <h2 className="text-2xl font-semibold text-slate-50">Token cost calculator</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <LabeledNumber label="Input tokens" value={inputTokens} onChange={setInputTokens} />
        <LabeledNumber label="Output tokens" value={outputTokens} onChange={setOutputTokens} />
        <LabeledNumber label="Input cost per 1M tokens" value={inputRate} onChange={setInputRate} />
        <LabeledNumber label="Output cost per 1M tokens" value={outputRate} onChange={setOutputRate} />
      </div>
      <p className="text-lg font-semibold text-slate-50">Estimated total: ${total.toFixed(4)}</p>
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50"
      />
    </label>
  );
}
