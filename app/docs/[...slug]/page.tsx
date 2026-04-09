import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/content/Markdown";
import { getDocBySlug, getDocs } from "@/lib/content";

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

  return {
    title: doc.metadata.title,
    description: doc.metadata.description,
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug.join("/"));

  if (!doc) {
    notFound();
  }

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">{doc.metadata.category}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{doc.metadata.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-600">{doc.metadata.description}</p>
      </header>
      <Markdown source={doc.content} />
    </article>
  );
}
