import fs from "fs";
import path from "path";

import { NEWS_SOURCES } from "../config/news-sources.mjs";
import { collectSourceItems, sanitizeQuotes, slugify, summarizeText } from "./feed-utils.mjs";

const AUTO_NEWS_DIR = path.join(process.cwd(), "content", "news", "auto");
const AUTOMATION_DIR = path.join(process.cwd(), "content", "automation");
const STATUS_FILE = path.join(AUTOMATION_DIR, "news-status.json");
const MAX_ITEMS_PER_SOURCE = Number(process.env.NEWS_SYNC_LIMIT ?? "20");
const DISCOVERY_MULTIPLIER = Number(process.env.NEWS_DISCOVERY_MULTIPLIER ?? "4");
const USER_AGENT =
  process.env.NEWS_SYNC_USER_AGENT ??
  "LLM-Docs News Sync (+https://github.com/LLM-Docs)";

async function main() {
  fs.mkdirSync(AUTO_NEWS_DIR, { recursive: true });
  fs.mkdirSync(AUTOMATION_DIR, { recursive: true });

  const existingSlugs = new Set(
    fs
      .readdirSync(AUTO_NEWS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, "")),
  );

  const results = [];
  let totalWritten = 0;

  for (const source of NEWS_SOURCES) {
    const result = {
      sourceId: source.id,
      sourceName: source.name,
      status: "success",
      written: 0,
      scanned: 0,
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
        if (!item.title || !item.link) {
          continue;
        }

        const slug = `${source.id}-${slugify(item.title).slice(0, 80)}`;

        if (existingSlugs.has(slug)) {
          continue;
        }

        const filePath = path.join(AUTO_NEWS_DIR, `${slug}.md`);
        fs.writeFileSync(filePath, toMarkdown(source, item), "utf8");
        existingSlugs.add(slug);
        result.written += 1;
        totalWritten += 1;
      }
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`[news-sync] ${source.name}:`, error);
    }

    results.push(result);
  }

  fs.writeFileSync(
    STATUS_FILE,
    JSON.stringify(
      {
        kind: "news",
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
          : `${result.sourceName}: +${result.written} (${result.discovered} discovered)`
      )
      .join("\n"),
  );
}

function toMarkdown(source, item) {
  const title = sanitizeQuotes(item.title);
  const description = sanitizeQuotes(
    summarizeText(item.description || `Latest update from ${source.name}.`),
  );
  const tags = [...source.tags, "auto-imported"];
  const body = [
    `# ${item.title}`,
    "",
    description,
    "",
    "## Source",
    "",
    `- Publisher: ${source.name}`,
    `- Original link: ${item.link}`,
    "",
    "## Summary",
    "",
    "This entry was generated automatically from an external source feed. Open the original link for the full article.",
  ].join("\n");

  return `---
title: "${title}"
description: "${description}"
date: "${item.date}"
author: "${sanitizeQuotes(source.name)}"
tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]
source: "${item.link}"
automation: "generated"
---

${body}
`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
