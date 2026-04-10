import SearchClient from "@/components/search/SearchClient";
import { getAllContentForSearch } from "@/lib/content";
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
  const [docs, news, agents, models] = await Promise.all([all.docs, all.news, all.agents, all.models]);

  return (
    <div className="px-6 pb-16 xl:px-0">
      <SearchClient items={[...docs, ...news, ...agents, ...models]} />
    </div>
  );
}
