import SearchClient from "@/components/search/SearchClient";
import { getAllContentForSearch, getAllModelComparisons, getTopicHubs } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Search",
  description: "Search documentation, models, agents, and news across LLM-Docs.",
  path: "/search",
});

metadata.robots = {
  index: false,
  follow: true,
};

export default async function SearchPage() {
  const all = getAllContentForSearch();
  const [docs, news, agents, models, comparisons, topics] = await Promise.all([
    all.docs,
    all.news,
    all.agents,
    all.models,
    getAllModelComparisons(),
    getTopicHubs(),
  ]);

  return (
    <div className="px-6 pb-16 xl:px-0">
      <SearchClient
        items={[
          ...docs,
          ...news,
          ...agents,
          ...models,
          ...comparisons.map((comparison) => ({
            id: comparison.slug,
            title: comparison.title,
            description: comparison.description,
            type: "comparison" as const,
            url: `/compare/${comparison.slug}`,
            tags: comparison.keywords,
            keywords: [
              comparison.category,
              comparison.left.name,
              comparison.right.name,
              comparison.left.provider,
              comparison.right.provider,
            ].filter((value): value is string => Boolean(value)),
          })),
          ...topics.map((topic) => ({
            id: topic.slug,
            title: topic.label,
            description: `${topic.count} connected pages across docs, models, agents, and news.`,
            type: "topic" as const,
            url: `/topics/${topic.slug}`,
            tags: [topic.label],
            keywords: topic.items.flatMap((item) => [item.title, ...(item.tags || [])]).slice(0, 12),
          })),
        ]}
      />
    </div>
  );
}
