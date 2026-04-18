export async function fetchText(url, userAgent, accept) {
  const timeoutMs = Number(process.env.SOURCE_FETCH_TIMEOUT_MS ?? "15000");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "user-agent": userAgent,
      accept: accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function fetchFeed(feedUrl, userAgent) {
  return fetchText(
    feedUrl,
    userAgent,
    "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
  );
}

export async function collectSourceItems(source, userAgent, maxItems, discoveryMultiplier = 3) {
  const items = [];

  if (source.feedUrl) {
    const feedText = await fetchFeed(source.feedUrl, userAgent);
    items.push(...parseFeed(feedText, source.format));
  }

  if (source.discoveryUrl || source.homepage) {
    try {
      const discovered = await discoverRecentArticles(
        source.discoveryUrl || source.homepage,
        userAgent,
        source.articlePathPrefixes || [],
        Math.max(maxItems * discoveryMultiplier, maxItems),
      );
      items.push(...discovered);
    } catch (error) {
      console.error(
        `[discovery] ${source.name}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return dedupeItems(items)
    .sort((left, right) => compareDates(right.date, left.date))
    .slice(0, maxItems);
}

export function parseFeed(xml, format = "xml") {
  if (format === "anthropic-newsroom") {
    return parseAnthropicNewsroom(xml);
  }

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
    title: decodeHtml(getTagValue(itemXml, "title")),
    link: decodeHtml(getTagValue(itemXml, "link")),
    description: decodeHtml(stripHtml(getTagValue(itemXml, "description"))),
    date: normalizeDate(getTagValue(itemXml, "pubDate")),
  };
}

function parseAtomEntry(entryXml) {
  return {
    title: decodeHtml(getTagValue(entryXml, "title")),
    link: decodeHtml(getAtomLink(entryXml)),
    description: decodeHtml(
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

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function parseAnthropicNewsroom(html) {
  const normalized = stripCdata(html);
  const items = [];
  const seen = new Set();
  const cardPattern =
    /<a href="(\/(?:news\/)?[^"#?]+)"[^>]*?(?:FeaturedGrid|PublicationList)[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of normalized.matchAll(cardPattern)) {
    const [, href, cardHtml] = match;
    const title = decodeHtml(
      stripHtml(getTagValue(cardHtml, "h4") || getTagValue(cardHtml, "h3") || getTagValue(cardHtml, "h2")),
    );
    const description = decodeHtml(stripHtml(getTagValue(cardHtml, "p")));
    const date = decodeHtml(stripHtml(getTagValue(cardHtml, "time")));
    const link = new URL(href, "https://www.anthropic.com").toString();

    if (!title || !date || seen.has(link)) {
      continue;
    }

    seen.add(link);
    items.push({
      title,
      link,
      description,
      date: normalizeDate(date),
    });
  }

  return items;
}

async function discoverRecentArticles(listingUrl, userAgent, articlePathPrefixes, maxCandidates) {
  const html = await fetchText(listingUrl, userAgent);
  const urls = extractCandidateUrls(html, listingUrl, articlePathPrefixes).slice(0, maxCandidates);
  const items = [];

  for (const url of urls) {
    try {
      const articleHtml = await fetchText(url, userAgent);
      const parsed = parseArticlePage(articleHtml, url);
      if (parsed) {
        items.push(parsed);
      }
    } catch (error) {
      console.error(`[discovery] ${url}:`, error instanceof Error ? error.message : String(error));
    }
  }

  return items;
}

function extractCandidateUrls(html, listingUrl, articlePathPrefixes) {
  const matches = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi)];
  const base = new URL(listingUrl);
  const seen = new Set();
  const urls = [];

  for (const match of matches) {
    const href = match[1];

    try {
      const url = new URL(href, base);
      url.hash = "";
      url.search = "";

      if (url.origin !== base.origin) {
        continue;
      }

      if (!isLikelyArticlePath(url.pathname, articlePathPrefixes)) {
        continue;
      }

      const normalized = url.toString();
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      urls.push(normalized);
    } catch {
      continue;
    }
  }

  return urls;
}

function isLikelyArticlePath(pathname, articlePathPrefixes) {
  if (articlePathPrefixes.length > 0) {
    return articlePathPrefixes.some((prefix) => pathname.startsWith(prefix));
  }

  return /(news|blog|research|announcement|updates)/i.test(pathname) && pathname.split("/").filter(Boolean).length >= 2;
}

function parseArticlePage(html, url) {
  const title = firstNonEmpty(
    getMetaContent(html, "property", "og:title"),
    getMetaContent(html, "name", "twitter:title"),
    getJsonLdValue(html, "headline"),
    stripHtml(getTagValue(html, "title")),
    stripHtml(getTagValue(html, "h1")),
  );

  const description = summarizeText(
    firstNonEmpty(
      getMetaContent(html, "property", "og:description"),
      getMetaContent(html, "name", "description"),
      getMetaContent(html, "name", "twitter:description"),
      getJsonLdValue(html, "description"),
      extractFirstParagraph(html),
    ) || "",
  );

  const date = normalizeDate(
    firstNonEmpty(
      getMetaContent(html, "property", "article:published_time"),
      getMetaContent(html, "name", "article:published_time"),
      getMetaContent(html, "property", "og:updated_time"),
      getJsonLdValue(html, "datePublished"),
      getJsonLdValue(html, "dateModified"),
      getTimeDateTime(html),
    ) || "",
  );

  if (!title) {
    return null;
  }

  return {
    title: decodeHtml(title),
    link: url,
    description: decodeHtml(description || `Latest update from ${new URL(url).hostname}.`),
    date,
  };
}

function getMetaContent(html, attribute, value) {
  const expression = new RegExp(
    `<meta\\b[^>]*${attribute}=["']${escapeRegex(value)}["'][^>]*content=["']([\\s\\S]*?)["'][^>]*>`,
    "i",
  );
  const reverseExpression = new RegExp(
    `<meta\\b[^>]*content=["']([\\s\\S]*?)["'][^>]*${attribute}=["']${escapeRegex(value)}["'][^>]*>`,
    "i",
  );

  return expression.exec(html)?.[1]?.trim() || reverseExpression.exec(html)?.[1]?.trim() || "";
}

function getJsonLdValue(html, key) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);
      const value = findJsonLdValue(data, key);
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    } catch {
      continue;
    }
  }

  return "";
}

function findJsonLdValue(value, key) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJsonLdValue(item, key);
      if (found) return found;
    }
    return "";
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (typeof value[key] === "string") {
    return value[key];
  }

  for (const entry of Object.values(value)) {
    const found = findJsonLdValue(entry, key);
    if (found) return found;
  }

  return "";
}

function getTimeDateTime(html) {
  const dateTimeMatch = html.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i);
  if (dateTimeMatch?.[1]) {
    return dateTimeMatch[1];
  }

  const textMatch = html.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i);
  return textMatch?.[1] ? stripHtml(textMatch[1]) : "";
}

function extractFirstParagraph(html) {
  const match = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return match?.[1] ? stripHtml(match[1]) : "";
}

function dedupeItems(items) {
  const byLink = new Map();

  for (const item of items) {
    if (!item?.title || !item?.link) {
      continue;
    }

    const key = normalizeItemKey(item.link, item.title);
    const current = byLink.get(key);
    if (!current || scoreItemCompleteness(item) > scoreItemCompleteness(current)) {
      byLink.set(key, item);
    }
  }

  return [...byLink.values()];
}

function normalizeItemKey(link, title) {
  try {
    const url = new URL(link);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return title.toLowerCase().trim();
  }
}

function scoreItemCompleteness(item) {
  let score = 0;
  if (item.title) score += 4;
  if (item.description) score += 2;
  if (item.date) score += 2;
  return score;
}

function compareDates(left, right) {
  return new Date(left || 0).getTime() - new Date(right || 0).getTime();
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
