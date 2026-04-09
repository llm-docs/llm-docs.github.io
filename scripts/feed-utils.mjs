export async function fetchFeed(feedUrl, userAgent) {
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent": userAgent,
      accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export function parseFeed(xml) {
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

export function normalizeDate(input) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeQuotes(value) {
  return value.replace(/"/g, '\\"');
}

export function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeText(value, maxLength = 220) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
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
  const alternateMatch = xml.match(
    /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i,
  );
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

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
