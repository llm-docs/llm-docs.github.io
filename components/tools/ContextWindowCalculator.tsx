"use client";

import { useMemo, useState } from "react";

export default function ContextWindowCalculator() {
  const [contextWindow, setContextWindow] = useState(128000);
  const [chunkSize, setChunkSize] = useState(1500);
  const [overlap, setOverlap] = useState(150);
  const [docs, setDocs] = useState(200000);

  const result = useMemo(() => {
    const effectiveChunk = Math.max(chunkSize - overlap, 1);
    const chunks = Math.ceil(docs / effectiveChunk);
    const maxChunksPerPrompt = Math.floor(contextWindow / chunkSize);
    return { chunks, maxChunksPerPrompt };
  }, [chunkSize, contextWindow, docs, overlap]);

  return (
    <div className="surface-card space-y-4">
      <h2 className="text-2xl font-semibold text-slate-50">Context and chunking helper</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Context window" value={contextWindow} onChange={setContextWindow} />
        <Field label="Chunk size" value={chunkSize} onChange={setChunkSize} />
        <Field label="Chunk overlap" value={overlap} onChange={setOverlap} />
        <Field label="Document tokens" value={docs} onChange={setDocs} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Estimated chunks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{result.chunks}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Max chunks per prompt</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{result.maxChunksPerPrompt}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
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
