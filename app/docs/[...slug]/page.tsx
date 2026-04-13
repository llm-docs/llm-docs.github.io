import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { Markdown } from "@/components/content/Markdown";
import { PrevNextLinks } from "@/components/content/PrevNextLinks";
import { RelatedLinks } from "@/components/content/RelatedLinks";
import { TableOfContents } from "@/components/content/TableOfContents";
import {
  getDocBySlug,
  getDocs,
  getDocsNavigation,
  getRelatedAgents,
  getRelatedDocs,
  getRelatedModels,
} from "@/lib/content";
import { extractHeadings } from "@/lib/headings";
import { buildPageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  const docs = await getDocs();
  return docs.map((doc) => ({
    slug: doc.slug.split("/"),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug(slug.join("/"));

  if (!doc) {
    return {};
  }

  return buildPageMetadata({
    title: `${doc.metadata.title} | LLM-Docs`,
    description: doc.metadata.description,
    path: `/docs/${slug.join("/")}`,
    image: doc.metadata.image,
    type: "article",
    publishedTime: doc.metadata.date,
    modifiedTime: doc.metadata.updatedAt,
    tags: doc.metadata.tags,
  });
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug.join("/"));

  if (!doc) {
    notFound();
  }

  const headings = extractHeadings(doc.content);
  const navigation = await getDocsNavigation(slug.join("/"));
  const [relatedDocs, relatedAgents, relatedModels] = await Promise.all([
    getRelatedDocs(slug.join("/"), doc.metadata.tags || []),
    getRelatedAgents("", doc.metadata.tags || []),
    getRelatedModels("", doc.metadata.tags || []),
  ]);

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: doc.metadata.title,
          description: doc.metadata.description,
          datePublished: doc.metadata.date,
          dateModified: doc.metadata.updatedAt,
          url: absoluteUrl(`/docs/${slug.join("/")}`),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/docs", label: "Docs" },
          { href: `/docs/${slug.join("/")}`, label: doc.metadata.title },
        ]}
      />
      <header className="space-y-3">
        <p className="eyebrow">{doc.metadata.category}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{doc.metadata.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">{doc.metadata.description}</p>
        <p className="text-sm text-slate-400">
          Published: {doc.metadata.date || "Unknown"} · Last updated: {doc.metadata.updatedAt || "Unknown"}
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Markdown source={doc.content} />
          <RelatedLinks
            title="Related docs"
            items={relatedDocs.map((item) => ({
              href: `/docs/${item.slug}`,
              label: item.title,
              description: item.description,
            }))}
          />
          <RelatedLinks
            title="Related models"
            items={relatedModels.map((item) => ({
              href: `/models/${item.slug}`,
              label: item.name,
              description: item.description,
            }))}
          />
          <RelatedLinks
            title="Related agents"
            items={relatedAgents.map((item) => ({
              href: `/agents/${item.slug}`,
              label: item.name,
              description: item.description,
            }))}
          />
          <PrevNextLinks
            previous={navigation.previous ? { href: `/docs/${navigation.previous.slug}`, label: navigation.previous.title } : null}
            next={navigation.next ? { href: `/docs/${navigation.next.slug}`, label: navigation.next.title } : null}
          />
        </div>
        <div className="space-y-6">
          <TableOfContents headings={headings} />
        </div>
      </div>
    </article>
  );
}
