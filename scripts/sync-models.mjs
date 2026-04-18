import fs from "fs";
import path from "path";

import { MODEL_SOURCES } from "../config/model-sources.mjs";
import { collectSourceItems, sanitizeQuotes, slugify, summarizeText } from "./feed-utils.mjs";

const AUTO_MODELS_DIR = path.join(process.cwd(), "content", "models", "auto");
const AUTOMATION_DIR = path.join(process.cwd(), "content", "automation");
const STATUS_FILE = path.join(AUTOMATION_DIR, "models-status.json");
const MAX_ITEMS_PER_SOURCE = Number(process.env.MODEL_SYNC_LIMIT ?? "24");
const DISCOVERY_MULTIPLIER = Number(process.env.MODEL_DISCOVERY_MULTIPLIER ?? "4");
const USER_AGENT =
  process.env.MODEL_SYNC_USER_AGENT ??
  "LLM-Docs Model Sync (+https://github.com/LLM-Docs)";

async function main() {
  fs.mkdirSync(AUTO_MODELS_DIR, { recursive: true });
  fs.mkdirSync(AUTOMATION_DIR, { recursive: true });

  const existingSlugs = new Set(
    fs
      .readdirSync(AUTO_MODELS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, "")),
  );

  const results = [];
  let totalWritten = 0;

  for (const source of MODEL_SOURCES) {
    const result = {
      sourceId: source.id,
      sourceName: source.name,
      status: "success",
      written: 0,
      scanned: 0,
      matched: 0,
      discovered: 0,
      error: "",
    };

    try {
      const items = await collectSourceItems(
        source,
        USER_AGENT,
        MAX_ITEMS_PER_SOURCE,
        DISCOVERY_MULTIPLIER,
      );
      result.scanned = items.length;
      result.discovered = items.length;

      for (const item of items) {
        if (!item.title || !item.link || !matchesKeywords(item, source.keywords)) {
          continue;
        }

        result.matched += 1;
        const slug = `${source.id}-${slugify(item.title).slice(0, 80)}`;

        if (existingSlugs.has(slug)) {
          continue;
        }

        const filePath = path.join(AUTO_MODELS_DIR, `${slug}.md`);
        fs.writeFileSync(filePath, toMarkdown(source, item), "utf8");
        existingSlugs.add(slug);
        result.written += 1;
        totalWritten += 1;
      }
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`[model-sync] ${source.name}:`, error);
    }

    results.push(result);
  }

  fs.writeFileSync(
    STATUS_FILE,
    JSON.stringify(
      {
        kind: "models",
        lastRunAt: new Date().toISOString(),
        totalWritten,
        sources: results,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    results
      .map((result) =>
        result.status === "failed"
          ? `${result.sourceName}: failed`
          : `${result.sourceName}: +${result.written} (${result.matched}/${result.discovered} matched)`
      )
      .join("\n"),
  );
}

function matchesKeywords(item, keywords) {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function toMarkdown(source, item) {
  const title = sanitizeQuotes(item.title);
  const description = sanitizeQuotes(
    summarizeText(item.description || `Automatic model update from ${source.name}.`),
  );

  return `---
name: "${title}"
description: "${description}"
provider: "${sanitizeQuotes(source.name)}"
releaseDate: "${item.date}"
status: "auto-detected"
contextWindow: ""
modalities: []
tags: [${[...source.tags, "auto-imported", "announcement"].map((tag) => `"${tag}"`).join(", ")}]
---

# ${item.title}

${item.description || `Latest model-related update from ${source.name}.`}

## Source

- Provider: ${source.name}
- Original link: ${item.link}

## Notes

This page was generated automatically from a tracked source feed because the entry looked model-related based on title and summary keywords. Review and enrich it if you want fuller specs such as pricing, context window, benchmarks, or modalities.
`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
