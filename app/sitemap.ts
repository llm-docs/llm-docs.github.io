import type { MetadataRoute } from "next";

import { getAgents, getAllModelComparisons, getDocs, getModels, getNews } from "@/lib/content";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://llm-docs.github.io";
  const [docs, news, agents, models, comparisons] = await Promise.all([
    getDocs(),
    getNews(),
    getAgents(),
    getModels(),
    getAllModelComparisons(),
  ]);

  const staticRoutes = ["", "/docs", "/news", "/models", "/agents", "/compare"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  return [
    ...staticRoutes,
    ...docs.map((doc) => ({ url: `${baseUrl}/docs/${doc.slug}`, lastModified: new Date(doc.date || Date.now()) })),
    ...news.map((item) => ({ url: `${baseUrl}/news/${item.slug}`, lastModified: new Date(item.date || Date.now()) })),
    ...agents.map((agent) => ({ url: `${baseUrl}/agents/${agent.slug}`, lastModified: new Date() })),
    ...models.map((model) => ({
      url: `${baseUrl}/models/${model.slug}`,
      lastModified: new Date(model.releaseDate || Date.now()),
    })),
    ...comparisons.map((comparison) => ({
      url: `${baseUrl}/compare/${comparison.slug}`,
      lastModified: new Date(),
    })),
  ];
}
