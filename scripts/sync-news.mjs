import fs from "fs";
import path from "path";

import { NEWS_SOURCES } from "../config/news-sources.mjs";

const AUTO_NEWS_DIR = path.join(process.cwd(), "content", "news", "auto");
const MAX_ITEMS_PER_SOURCE = Number(process.env.NEWS_SYNC_LIMIT ?? "6");
const USER_AGENT =
  process.env.NEWS_SYNC_USER_AGENT ??
  "LLM-Docs News Sync (+https://github.com/LLM-Docs)";

async function main() {
  fs.mkdirSync(AUTO_NEWS_DIR, { recursive: true });

  const existingSlugs = new Set(
    fs
      .readdirSync(AUTO_NEWS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, "")),
  );

  const summary = [];

  for (const source of NEWS_SOURCES) {
    try {
      const xml = await fetchFeed(source.feedUrl);
      const items = parseFeed(xml).slice(0, MAX_ITEMS_PER_SOURCE);
      let written = 0;

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
        written += 1;
      }

      summary.push(`${source.name}: +${written}`);
    } catch (error) {
      summary.push(`${source.name}: failed`);
      console.error(`[news-sync] ${source.name}:`, error);
    }
  }

  console.log(summary.join("\n"));
}

async function fetchFeed(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseFeed(xml) {
  const normalized = stripCdata(xml);
  const rssItems = collectMatches(normalized, /<item\b[\s\S]*?<\/item>/gi).map((itemXml) =>
    parseRssItem(itemXml),
  );

  if (rssItems.length > 0) {
    return rssItems.filter(Boolean);
  }

  return collectMatches(normalized, /<entry\b[\s\S]*?<\/entry>/gi)
    .map((entryXml) => parseAtomEntry(entryXml))
    .filter(Boolean);
}

function parseRssItem(itemXml) {
  return {
    title: decodeXml(getTagValue(itemXml, "title")),
    link: decodeXml(getTagValue(itemXml, "link")),
    description: decodeXml(stripHtml(getTagValue(itemXml, "description"))),
    date: normalizeDate(getTagValue(itemXml, "pubDate")),
  };
}

function parseAtomEntry(entryXml) {
  return {
    title: decodeXml(getTagValue(entryXml, "title")),
    link: decodeXml(getAtomLink(entryXml)),
    description: decodeXml(
      stripHtml(getTagValue(entryXml, "summary") || getTagValue(entryXml, "content")),
    ),
    date: normalizeDate(getTagValue(entryXml, "published") || getTagValue(entryXml, "updated")),
  };
}

function getTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function getAtomLink(xml) {
  const alternateMatch = xml.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (alternateMatch?.[1]) {
    return alternateMatch[1];
  }

  const hrefMatch = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return hrefMatch?.[1] ?? "";
}

function collectMatches(value, expression) {
  return [...value.matchAll(expression)].map((match) => match[0]);
}

function stripCdata(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function normalizeDate(input) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toMarkdown(source, item) {
  const title = sanitizeQuotes(item.title);
  const description = sanitizeQuotes(item.description || `Latest update from ${source.name}.`);
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

function sanitizeQuotes(value) {
  return value.replace(/"/g, '\\"');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
