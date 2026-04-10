import type { Metadata } from "next";

import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
};

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  tags = [],
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE;
  const normalizedTitle = normalizePageTitle(title);

  return {
    title: normalizedTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: normalizedTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type,
      images: [
        {
          url: ogImage,
          alt: `${SITE_NAME} preview image`,
        },
      ],
      publishedTime,
      modifiedTime,
      tags,
    },
    twitter: {
      card: "summary_large_image",
      title: normalizedTitle,
      description,
      images: [ogImage],
    },
  };
}

function normalizePageTitle(title: string) {
  const suffix = `| ${SITE_NAME}`;
  return title.endsWith(` ${suffix}`) ? title.slice(0, -(` ${suffix}`.length)) : title;
}
