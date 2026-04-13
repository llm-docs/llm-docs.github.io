import type { Metadata } from "next";

import Layout from "@/components/layout/Layout";
import { JsonLd } from "@/components/content/JsonLd";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "LLM-Docs tracks AI models, release updates, comparisons, and practical research pages in one place.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "LLM-Docs tracks AI models, release updates, comparisons, and practical research pages in one place.",
    url: SITE_URL,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, alt: `${SITE_NAME} logo` }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "LLM-Docs tracks AI models, release updates, comparisons, and practical research pages in one place.",
    images: [DEFAULT_OG_IMAGE],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            logo: DEFAULT_OG_IMAGE,
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          }}
        />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
