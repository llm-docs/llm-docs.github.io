import type { Metadata } from "next";

import Layout from "@/components/layout/Layout";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://llm-docs.github.io"),
  title: {
    default: "LLM-Docs",
    template: "%s | LLM-Docs",
  },
  description: "Open documentation hub for LLMs, model releases, agent frameworks, and ecosystem updates.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "LLM-Docs",
    description: "Open documentation hub for LLMs, model releases, agent frameworks, and ecosystem updates.",
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
