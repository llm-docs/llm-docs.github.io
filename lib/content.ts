import fs from "fs";
import path from "path";
import matter from "gray-matter";

import type { AgentMetadata, DocMetadata, ModelMetadata, NewsMetadata } from "@/types";

const contentDir = path.join(process.cwd(), "content");

export async function getDocs(): Promise<(DocMetadata & { slug: string })[]> {
  return getCollection("docs", (data, slug) => ({
    slug,
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    category: ensureString(data.category, "General"),
    tags: ensureStringArray(data.tags),
    author: ensureString(data.author),
  }));
}

export async function getDocBySlug(slug: string): Promise<{ metadata: DocMetadata; content: string } | null> {
  return getCollectionItem("docs", slug, (data) => ({
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    category: ensureString(data.category, "General"),
    tags: ensureStringArray(data.tags),
    author: ensureString(data.author),
  }));
}

export async function getNews(): Promise<(NewsMetadata & { slug: string })[]> {
  return getCollection("news", (data, slug) => ({
    slug,
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    author: ensureString(data.author, "Anonymous"),
    image: ensureString(data.image),
    tags: ensureStringArray(data.tags),
    source: ensureString(data.source),
  }));
}

export async function getNewsBySlug(slug: string): Promise<{ metadata: NewsMetadata; content: string } | null> {
  return getCollectionItem("news", slug, (data) => ({
    title: ensureString(data.title, "Untitled"),
    description: ensureString(data.description),
    date: ensureString(data.date),
    author: ensureString(data.author, "Anonymous"),
    image: ensureString(data.image),
    tags: ensureStringArray(data.tags),
    source: ensureString(data.source),
  }));
}

export async function getAgents(): Promise<(AgentMetadata & { slug: string })[]> {
  return getCollection("agents", (data, slug) => ({
    slug,
    name: ensureString(data.name, ensureString(data.title, "Unnamed Agent")),
    description: ensureString(data.description),
    category: ensureString(data.category, "General"),
    url: ensureString(data.url),
    github: ensureString(data.github),
    tags: ensureStringArray(data.tags),
    features: ensureStringArray(data.features),
  }));
}

export async function getAgentBySlug(slug: string): Promise<{ metadata: AgentMetadata; content: string } | null> {
  return getCollectionItem("agents", slug, (data) => ({
    name: ensureString(data.name, ensureString(data.title, "Unnamed Agent")),
    description: ensureString(data.description),
    category: ensureString(data.category, "General"),
    url: ensureString(data.url),
    github: ensureString(data.github),
    tags: ensureStringArray(data.tags),
    features: ensureStringArray(data.features),
  }));
}

export async function getModels(): Promise<(ModelMetadata & { slug: string })[]> {
  return getCollection("models", (data, slug) => ({
    slug,
    name: ensureString(data.name, "Untitled Model"),
    description: ensureString(data.description),
    provider: ensureString(data.provider, "Unknown Provider"),
    releaseDate: ensureString(data.releaseDate),
    status: ensureString(data.status, "tracked"),
    contextWindow: ensureString(data.contextWindow),
    modalities: ensureStringArray(data.modalities),
    tags: ensureStringArray(data.tags),
  }));
}

export async function getModelBySlug(slug: string): Promise<{ metadata: ModelMetadata; content: string } | null> {
  return getCollectionItem("models", slug, (data) => ({
    name: ensureString(data.name, "Untitled Model"),
    description: ensureString(data.description),
    provider: ensureString(data.provider, "Unknown Provider"),
    releaseDate: ensureString(data.releaseDate),
    status: ensureString(data.status, "tracked"),
    contextWindow: ensureString(data.contextWindow),
    modalities: ensureStringArray(data.modalities),
    tags: ensureStringArray(data.tags),
  }));
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
  mapper: (data: Record<string, unknown>, slug: string) => T,
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

      return mapper(data, slug);
    })
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
}

function getCollectionItem<T>(
  collection: string,
  slug: string,
  mapper: (data: Record<string, unknown>) => T,
): { metadata: T; content: string } | null {
  const fullPath = path.join(contentDir, collection, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    metadata: mapper(data),
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
