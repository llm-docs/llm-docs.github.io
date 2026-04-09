"use client";

import { useState } from "react";

export function EmbedSnippet({ src, title }: { src: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe src="${src}" title="${title}" width="100%" height="720" style="border:0;border-radius:16px;overflow:hidden"></iframe>`;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="surface-card space-y-4">
      <h2 className="text-2xl font-semibold text-slate-50">Embed this view</h2>
      <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-[rgba(15,23,42,0.6)] p-4 text-xs text-slate-300">
        {snippet}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        {copied ? "Copied" : "Copy embed snippet"}
      </button>
    </div>
  );
}
