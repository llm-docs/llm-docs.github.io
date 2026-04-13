import { FeedbackLinks } from "@/components/feedback/FeedbackLinks";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Feedback | LLM-Docs",
  description: "Suggest updates, request comparison pages, and report outdated information.",
  path: "/feedback",
});

export default function FeedbackPage() {
  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Feedback</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Help improve the site</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          Use the issue links below to suggest updates, request comparisons, or report outdated information.
        </p>
      </header>
      <FeedbackLinks context="general website feedback" />
    </section>
  );
}
