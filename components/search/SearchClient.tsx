"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SearchItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  tags?: string[];
  provider?: string;
  author?: string;
  category?: string;
  date?: string;
  keywords?: string[];
};

export default function SearchClient({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const availableTypes = useMemo(
    () => ["all", ...new Set(items.map((item) => item.type))],
    [items],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const queryTokens = tokenize(normalized);

    const ranked = items
      .filter((item) => (type === "all" ? true : item.type === type))
      .map((item) => ({
        item,
        score: normalized ? scoreItem(item, normalized, queryTokens) : defaultScore(item),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return getTimestamp(right.item.date) - getTimestamp(left.item.date);
      })
      .slice(0, 60)
      .map(({ item }) => item);

    return ranked;
  }, [items, query, type]);

  const grouped = useMemo(() => {
    return {
      docs: results.filter((item) => item.type === "doc"),
      news: results.filter((item) => item.type === "news"),
      models: results.filter((item) => item.type === "model"),
      agents: results.filter((item) => item.type === "agent"),
      comparisons: results.filter((item) => item.type === "comparison"),
      topics: results.filter((item) => item.type === "topic"),
    };
  }, [results]);

  const suggestedQueries = useMemo(() => {
    const latest = [...items]
      .filter((item) => item.type === "model" || item.type === "news")
      .sort((left, right) => getTimestamp(right.date) - getTimestamp(left.date))
      .slice(0, 6)
      .map((item) => item.title);

    return latest.length ? latest : ["Claude Opus 4.7", "Anthropic", "RAG", "model comparison"];
  }, [items]);

  return (
    <section className="space-y-6">
      <div className="surface-card space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Search the library</h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Search docs, news, model pages, comparisons, topics, and agents with stronger title ranking, tag matching,
          provider aliases, and fresher release weighting.
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Claude, Opus 4.7, Anthropic, RAG, agents, comparisons..."
          className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setType(entry)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                type === entry
                  ? "border-sky-400 bg-sky-400/15 text-sky-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {entry === "all" ? "All" : getTypeLabel(entry)}
            </button>
          ))}
        </div>
        {!query.trim() ? (
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuery(suggestion)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-slate-400">
          {results.length} result{results.length === 1 ? "" : "s"}
          {type === "all" ? "" : ` in ${getTypeLabel(type).toLowerCase()}`}
        </p>
      </div>
      {!results.length ? (
        <div className="surface-card space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">No matches</h2>
          <p className="text-sm leading-7 text-slate-300">
            Try a broader vendor name, a model family, or a capability term like `agents`, `RAG`, `vision`, or `benchmark`.
          </p>
        </div>
      ) : null}
      <ResultGroup title="Docs" query={query} items={grouped.docs} />
      <ResultGroup title="News" query={query} items={grouped.news} />
      <ResultGroup title="Models" query={query} items={grouped.models} />
      <ResultGroup title="Agents" query={query} items={grouped.agents} />
      <ResultGroup title="Comparisons" query={query} items={grouped.comparisons} />
      <ResultGroup title="Topics" query={query} items={grouped.topics} />
    </section>
  );
}

function ResultGroup({
  title,
  items,
  query,
}: {
  title: string;
  items: SearchItem[];
  query: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h2>
      <div className="grid gap-4">
        {items.map((item) => (
          <Link key={item.id} href={item.url} className="surface-card space-y-2 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              {[item.type, item.provider || item.author || item.category, formatDate(item.date)].filter(Boolean).join(" • ")}
            </p>
            <h3 className="text-xl font-semibold text-slate-50">{highlight(item.title, query)}</h3>
            <p className="text-sm leading-6 text-slate-300">{highlight(item.description, query)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) {
    return text;
  }

  const matches = tokenize(query).filter((token) => token.length >= 2);
  if (!matches.length) return text;

  const escaped = matches
    .sort((left, right) => right.length - left.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));

  return parts.map((part, index) => {
    const isMatch = matches.some((token) => token.toLowerCase() === part.toLowerCase());
    if (!isMatch) {
      return part;
    }

    return (
      <mark key={`${part}-${index}`} className="rounded bg-sky-400/20 px-1 text-sky-200">
        {part}
      </mark>
    );
  });
}

function getTypeLabel(type: string) {
  if (type === "doc") return "Docs";
  if (type === "news") return "News";
  if (type === "model") return "Models";
  if (type === "agent") return "Agents";
  if (type === "comparison") return "Comparisons";
  if (type === "topic") return "Topics";
  return `${type[0].toUpperCase()}${type.slice(1)}s`;
}

function defaultScore(item: SearchItem) {
  return 1 + Math.min(getRecencyBonus(item.date), 18);
}

function scoreItem(item: SearchItem, normalizedQuery: string, queryTokens: string[]) {
  const title = normalize(item.title);
  const description = normalize(item.description);
  const tags = (item.tags || []).map(normalize);
  const keywords = (item.keywords || []).map(normalize);
  const provider = normalize(item.provider || item.author || "");
  const category = normalize(item.category || "");
  const expandedTokens = [...new Set([...queryTokens, ...expandAliases(queryTokens)])];

  let score = 0;

  if (title === normalizedQuery) score += 280;
  if (title.startsWith(normalizedQuery)) score += 180;
  if (title.includes(normalizedQuery)) score += 120;
  if (provider === normalizedQuery) score += 90;
  if (provider.includes(normalizedQuery) || category.includes(normalizedQuery)) score += 40;

  for (const token of expandedTokens) {
    if (token.length < 2) continue;

    if (title.includes(token)) score += 44;
    if (description.includes(token)) score += 10;
    if (provider.includes(token)) score += 26;
    if (category.includes(token)) score += 18;
    if (tags.some((tag) => tag.includes(token))) score += 22;
    if (keywords.some((keyword) => keyword.includes(token))) score += 20;
  }

  const matchedTokenCount = queryTokens.filter((token) =>
    [title, description, provider, category, ...tags, ...keywords].some((field) => field.includes(token)),
  ).length;

  if (queryTokens.length && matchedTokenCount === queryTokens.length) {
    score += 48;
  } else {
    score += matchedTokenCount * 12;
  }

  if (fuzzyMatch(title, normalizedQuery) || tags.some((tag) => fuzzyMatch(tag, normalizedQuery))) {
    score += 10;
  }

  score += getRecencyBonus(item.date);
  return score;
}

function fuzzyMatch(haystack: string, query: string) {
  let pointer = 0;
  for (const char of haystack) {
    if (char === query[pointer]) {
      pointer += 1;
      if (pointer === query.length) {
        return true;
      }
    }
  }

  return false;
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9.#+-]+/)
    .filter(Boolean);
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function expandAliases(tokens: string[]) {
  const aliases: Record<string, string[]> = {
    anthropic: ["claude"],
    claude: ["anthropic"],
    openai: ["gpt", "chatgpt"],
    gpt: ["openai", "chatgpt"],
    chatgpt: ["openai", "gpt"],
    google: ["gemini"],
    gemini: ["google"],
    opus: ["claude", "anthropic"],
    sonnet: ["claude", "anthropic"],
    "4.7": ["opus", "claude"],
    "opus-4.7": ["opus", "4.7", "claude"],
    opus47: ["opus", "4.7", "claude"],
  };

  return tokens.flatMap((token) => aliases[token] || []);
}

function getTimestamp(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getRecencyBonus(value?: string) {
  const timestamp = getTimestamp(value);
  if (!timestamp) return 0;

  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days <= 14) return 24;
  if (days <= 45) return 14;
  if (days <= 120) return 8;
  return 0;
}

function formatDate(value?: string) {
  const timestamp = getTimestamp(value);
  if (!timestamp) return "";

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(timestamp);
}
