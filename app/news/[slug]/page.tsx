import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/content/Markdown";
import { getNews, getNewsBySlug } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const news = await getNews();
  return news.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);

  if (!item) {
    return {};
  }

  return {
    title: item.metadata.title,
    description: item.metadata.description,
  };
}

export default async function NewsPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Update</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{item.metadata.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-600">{item.metadata.description}</p>
      </header>
      <Markdown source={item.content} />
    </article>
  );
}
