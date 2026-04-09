import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { Markdown } from "@/components/content/Markdown";
import { RelatedLinks } from "@/components/content/RelatedLinks";
import { getNews, getNewsBySlug, getRelatedDocs, getRelatedModels, getRelatedNews } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  const news = await getNews();
  return news.map((item) => ({
    slug: item.slug.split("/"),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug.join("/"));

  if (!item) {
    return {};
  }

  return buildPageMetadata({
    title: `${item.metadata.title} | LLM-Docs`,
    description: item.metadata.description,
    path: `/news/${slug.join("/")}`,
    image: item.metadata.image,
    type: "article",
    publishedTime: item.metadata.date,
    modifiedTime: item.metadata.updatedAt,
    tags: item.metadata.tags,
  });
}

export default async function NewsPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug.join("/"));

  if (!item) {
    notFound();
  }

  const [relatedNews, relatedDocs, relatedModels] = await Promise.all([
    getRelatedNews(slug.join("/"), item.metadata.tags || []),
    getRelatedDocs("", item.metadata.tags || []),
    getRelatedModels("", item.metadata.tags || []),
  ]);

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: item.metadata.title,
          description: item.metadata.description,
          datePublished: item.metadata.date,
          dateModified: item.metadata.updatedAt,
          author: { "@type": "Organization", name: item.metadata.author },
          url: absoluteUrl(`/news/${slug.join("/")}`),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/news", label: "News" },
          { href: `/news/${slug.join("/")}`, label: item.metadata.title },
        ]}
      />
      <header className="space-y-3">
        <p className="eyebrow">Update</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{item.metadata.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">{item.metadata.description}</p>
        <p className="text-sm text-slate-400">
          Published: {item.metadata.date || "Unknown"} · Source: {item.metadata.source || "Editorial"}
        </p>
      </header>
      <Markdown source={item.content} />
      <RelatedLinks
        title="Related updates"
        items={relatedNews.map((entry) => ({
          href: `/news/${entry.slug}`,
          label: entry.title,
          description: entry.description,
        }))}
      />
      <RelatedLinks
        title="Related model pages"
        items={relatedModels.map((model) => ({
          href: `/models/${model.slug}`,
          label: model.name,
          description: model.description,
        }))}
      />
      <RelatedLinks
        title="Related documentation"
        items={relatedDocs.map((doc) => ({
          href: `/docs/${doc.slug}`,
          label: doc.title,
          description: doc.description,
        }))}
      />
    </article>
  );
}
