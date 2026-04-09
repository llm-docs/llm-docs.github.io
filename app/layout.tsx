import type { Metadata } from "next";

import Layout from "@/components/layout/Layout";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://llm-docs.github.io"),
  title: {
    default: "LLM-Docs",
    template: "%s | LLM-Docs",
  },
  description: "LLM-Docs tracks AI models, release updates, comparisons, and practical research pages in one place.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "LLM-Docs",
    description: "LLM-Docs tracks AI models, release updates, comparisons, and practical research pages in one place.",
    images: [
      {
        url: "/logo.png",
        alt: "LLM-Docs logo",
      },
    ],
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
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
