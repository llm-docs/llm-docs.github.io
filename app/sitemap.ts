import type { MetadataRoute } from "next";

import {
  getAgents,
  getAllModelComparisons,
  getDocs,
  getModels,
  getNews,
  getProviderHubs,
  getTopicHubs,
} from "@/lib/content";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://llm-docs.github.io";
  const [docs, news, agents, models, comparisons, providers, topics] = await Promise.all([
    getDocs(),
    getNews(),
    getAgents(),
    getModels(),
    getAllModelComparisons(),
    getProviderHubs(),
    getTopicHubs(),
  ]);

  const staticRoutes = [
    "",
    "/docs",
    "/news",
    "/models",
    "/agents",
    "/compare",
    "/search",
    "/topics",
    "/providers",
    "/insights",
    "/tools",
    "/trackers",
    "/trackers/releases",
    "/feedback",
    "/about",
    "/terms",
    "/privacy",
    "/contact",
    "/editorial-policy",
  ].map((route) => ({
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
    ...providers.map((provider) => ({
      url: `${baseUrl}/providers/${provider.slug}`,
      lastModified: new Date(),
    })),
    ...topics.map((topic) => ({
      url: `${baseUrl}/topics/${topic.slug}`,
      lastModified: new Date(),
    })),
  ];
}
