import fs from "fs";
import path from "path";
import matter from "gray-matter";

import type {
  AgentMetadata,
  AutomationStatus,
  DocMetadata,
  ModelComparison,
  ModelMetadata,
  NewsMetadata,
} from "@/types";

const contentDir = path.join(process.cwd(), "content");

export async function getDocs(): Promise<(DocMetadata & { slug: string })[]> {
  return getCollection("docs", (data, slug, filePath) => ({
    slug,
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
    category: ensureString(data.category, "General"),
    tags: ensureStringArray(data.tags),
    author: ensureString(data.author),
    image: ensureString(data.image),
  }));
}

export async function getDocBySlug(slug: string): Promise<{ metadata: DocMetadata; content: string } | null> {
  return getCollectionItem("docs", slug, (data, filePath) => ({
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
    category: ensureString(data.category, "General"),
    tags: ensureStringArray(data.tags),
    author: ensureString(data.author),
    image: ensureString(data.image),
  }));
}

export async function getNews(): Promise<(NewsMetadata & { slug: string })[]> {
  return getCollection("news", (data, slug, filePath) => ({
    slug,
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
    author: ensureString(data.author, "Anonymous"),
    image: ensureString(data.image),
    tags: ensureStringArray(data.tags),
    source: ensureString(data.source),
  }));
}

export async function getNewsBySlug(slug: string): Promise<{ metadata: NewsMetadata; content: string } | null> {
  return getCollectionItem("news", slug, (data, filePath) => ({
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
    author: ensureString(data.author, "Anonymous"),
    image: ensureString(data.image),
    tags: ensureStringArray(data.tags),
    source: ensureString(data.source),
  }));
}

export async function getAgents(): Promise<(AgentMetadata & { slug: string })[]> {
  return getCollection("agents", (data, slug, filePath) => ({
    slug,
    name: ensureString(data.name, ensureString(data.title, "Unnamed Agent")),
    description: ensureString(data.description),
    category: ensureString(data.category, "General"),
    url: ensureString(data.url),
    github: ensureString(data.github),
    tags: ensureStringArray(data.tags),
    features: ensureStringArray(data.features),
    useCases: ensureStringArray(data.useCases),
    alternatives: ensureStringArray(data.alternatives),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
  }));
}

export async function getAgentBySlug(slug: string): Promise<{ metadata: AgentMetadata; content: string } | null> {
  return getCollectionItem("agents", slug, (data, filePath) => ({
    name: ensureString(data.name, ensureString(data.title, "Unnamed Agent")),
    description: ensureString(data.description),
    category: ensureString(data.category, "General"),
    url: ensureString(data.url),
    github: ensureString(data.github),
    tags: ensureStringArray(data.tags),
    features: ensureStringArray(data.features),
    useCases: ensureStringArray(data.useCases),
    alternatives: ensureStringArray(data.alternatives),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
  }));
}

export async function getModels(): Promise<(ModelMetadata & { slug: string })[]> {
  return getCollection("models", (data, slug, filePath) => ({
    slug,
    name: ensureString(data.name, "Untitled Model"),
    description: ensureString(data.description),
    provider: ensureString(data.provider, "Unknown Provider"),
    releaseDate: ensureString(data.releaseDate),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
    status: ensureString(data.status, "tracked"),
    contextWindow: ensureString(data.contextWindow),
    modalities: ensureStringArray(data.modalities),
    tags: ensureStringArray(data.tags),
    useCases: ensureStringArray(data.useCases),
    pricing: ensureString(data.pricing),
    image: ensureString(data.image),
  }));
}

export async function getModelBySlug(slug: string): Promise<{ metadata: ModelMetadata; content: string } | null> {
  return getCollectionItem("models", slug, (data, filePath) => ({
    name: ensureString(data.name, "Untitled Model"),
    description: ensureString(data.description),
    provider: ensureString(data.provider, "Unknown Provider"),
    releaseDate: ensureString(data.releaseDate),
    updatedAt: ensureString(data.updatedAt, getFileDate(filePath)),
    status: ensureString(data.status, "tracked"),
    contextWindow: ensureString(data.contextWindow),
    modalities: ensureStringArray(data.modalities),
    tags: ensureStringArray(data.tags),
    useCases: ensureStringArray(data.useCases),
    pricing: ensureString(data.pricing),
    image: ensureString(data.image),
  }));
}

export async function getAutomationStatus(): Promise<{
  news: AutomationStatus | null;
  models: AutomationStatus | null;
}> {
  return {
    news: readAutomationStatus("news-status.json"),
    models: readAutomationStatus("models-status.json"),
  };
}

export async function getAllModelComparisons(): Promise<ModelComparison[]> {
  const models = await getModels();
  const topLevelModels = models.filter((model) => !model.slug.startsWith("auto/"));
  const comparisons: ModelComparison[] = [];

  for (let index = 0; index < topLevelModels.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < topLevelModels.length; nextIndex += 1) {
      comparisons.push(buildComparison(topLevelModels[index], topLevelModels[nextIndex]));
    }
  }

  return comparisons;
}

export async function getComparisonBySlug(slug: string): Promise<ModelComparison | null> {
  const comparisons = await getAllModelComparisons();
  return comparisons.find((comparison) => comparison.slug === slug) ?? null;
}

export async function getModelComparisons(modelSlug: string): Promise<ModelComparison[]> {
  const comparisons = await getAllModelComparisons();
  return comparisons.filter(
    (comparison) => comparison.left.slug === modelSlug || comparison.right.slug === modelSlug,
  );
}

export async function getRelatedDocs(slug: string, tags: string[], limit = 3) {
  const docs = await getDocs();
  return docs.filter((doc) => doc.slug !== slug && overlap(doc.tags, tags)).slice(0, limit);
}

export async function getRelatedNews(slug: string, tags: string[], limit = 3) {
  const news = await getNews();
  return news.filter((item) => item.slug !== slug && overlap(item.tags, tags)).slice(0, limit);
}

export async function getRelatedModels(slug: string, tags: string[], limit = 3) {
  const models = await getModels();
  return models.filter((model) => model.slug !== slug && overlap(model.tags, tags)).slice(0, limit);
}

export async function getRelatedAgents(slug: string, tags: string[], limit = 3) {
  const agents = await getAgents();
  return agents.filter((agent) => agent.slug !== slug && overlap(agent.tags, tags)).slice(0, limit);
}

export async function getDocsNavigation(slug: string) {
  const docs = await getDocs();
  const index = docs.findIndex((doc) => doc.slug === slug);

  return {
    previous: index > 0 ? docs[index - 1] : null,
    next: index >= 0 && index < docs.length - 1 ? docs[index + 1] : null,
  };
}

export async function getTopicHubs() {
  const all = getAllContentForSearch();
  const items = [...(await all.docs), ...(await all.news), ...(await all.agents), ...(await all.models)];
  const buckets = new Map<string, { slug: string; label: string; count: number; items: typeof items }>();

  for (const item of items) {
    for (const tag of item.tags || []) {
      const slug = slugifyComparisonPart(tag);
      const existing = buckets.get(slug);
      if (existing) {
        existing.count += 1;
        existing.items.push(item);
      } else {
        buckets.set(slug, {
          slug,
          label: toTitleCase(tag),
          count: 1,
          items: [item],
        });
      }
    }
  }

  return [...buckets.values()]
    .filter((topic) => topic.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 24);
}

export async function getTopicHubBySlug(slug: string) {
  if (!slug) {
    return null;
  }

  const topics = await getTopicHubs();
  const topic = topics.find((item) => item.slug === slug);
  if (!topic) {
    return null;
  }

  return {
    ...topic,
    items: topic.items.map((item) => ({
      href: item.url,
      label: item.title,
      description: item.description,
      type: item.type,
    })),
  };
}

export function getAllFiles(dir: string, ext: string): string[] {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let result: string[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      result = result.concat(getAllFiles(fullPath, ext));
    } else if (file.name.endsWith(ext)) {
      result.push(fullPath);
    }
  }

  return result;
}

export function getAllContentForSearch() {
  const docs = getDocs();
  const news = getNews();
  const agents = getAgents();
  const models = getModels();

  return {
    docs: docs.then((items) =>
      items.map((doc) => ({
        id: doc.slug,
        title: doc.title,
        description: doc.description,
        type: "doc" as const,
        url: `/docs/${doc.slug}`,
        tags: doc.tags,
      })),
    ),
    news: news.then((items) =>
      items.map((item) => ({
        id: item.slug,
        title: item.title,
        description: item.description,
        type: "news" as const,
        url: `/news/${item.slug}`,
        tags: item.tags,
      })),
    ),
    agents: agents.then((items) =>
      items.map((agent) => ({
        id: agent.slug,
        title: agent.name,
        description: agent.description,
        type: "agent" as const,
        url: `/agents/${agent.slug}`,
        tags: agent.tags,
      })),
    ),
    models: models.then((items) =>
      items.map((model) => ({
        id: model.slug,
        title: model.name,
        description: model.description,
        type: "model" as const,
        url: `/models/${model.slug}`,
        tags: model.tags,
      })),
    ),
  };
}

function getCollection<T extends { slug: string }>(
  collection: string,
  mapper: (data: Record<string, unknown>, slug: string, filePath: string) => T,
): T[] {
  const collectionDir = path.join(contentDir, collection);

  if (!fs.existsSync(collectionDir)) {
    return [];
  }

  const files = getAllFiles(collectionDir, ".md");

  return files
    .map((file) => {
      const fileContents = fs.readFileSync(file, "utf8");
      const { data } = matter(fileContents);
      const slug = file.replace(`${collectionDir}/`, "").replace(".md", "");

      return mapper(data, slug, file);
    })
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
}

function getCollectionItem<T>(
  collection: string,
  slug: string,
  mapper: (data: Record<string, unknown>, filePath: string) => T,
): { metadata: T; content: string } | null {
  const fullPath = path.join(contentDir, collection, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    metadata: mapper(data, fullPath),
    content,
  };
}

function getSortTimestamp(item: unknown) {
  if (!item || typeof item !== "object") {
    return 0;
  }

  const dated = item as { date?: string; releaseDate?: string };
  const value = dated.date || dated.releaseDate;

  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function ensureString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function buildComparison(
  left: ModelMetadata & { slug: string },
  right: ModelMetadata & { slug: string },
): ModelComparison {
  const ordered = [left, right].sort((a, b) => a.name.localeCompare(b.name));
  const first = ordered[0];
  const second = ordered[1];

  return {
    slug: `${slugifyComparisonPart(first.name)}-vs-${slugifyComparisonPart(second.name)}`,
    title: `${first.name} vs ${second.name} (2026): Features, Benchmarks, Pricing, and Verdict`,
    description: `Compare ${first.name} and ${second.name} across provider positioning, release timing, context windows, and practical evaluation criteria.`,
    category: "Model Comparison",
    keywords: [
      `${first.name} vs ${second.name}`,
      `${first.name} comparison`,
      `${second.name} comparison`,
      `${first.name} vs ${second.name} pricing`,
      `${first.name} vs ${second.name} benchmarks`,
    ],
    left: first,
    right: second,
  };
}

function slugifyComparisonPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function overlap(left: string[] = [], right: string[] = []) {
  return left.some((item) => right.includes(item));
}

function getFileDate(filePath: string) {
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function toTitleCase(value: string) {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function readAutomationStatus(fileName: string): AutomationStatus | null {
  const filePath = path.join(contentDir, "automation", fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as AutomationStatus;
    return parsed;
  } catch {
    return null;
  }
}
