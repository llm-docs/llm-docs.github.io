import { Mail } from "lucide-react";

/**
 * Newsletter subscription component using Buttondown.
 *
 * SETUP: Replace "YOUR_BUTTONDOWN_REFERRAL_ID" in the form action
 * with your actual Buttondown referral ID (found in your dashboard).
 *
 * Alternative providers: swap the <form action="..."> URL and hidden
 * fields to match your provider (Mailchimp, ConvertKit, Substack, etc.)
 */
export default function NewsletterSubscribe({
  title = "Stay in the loop",
  description = "Get weekly summaries of the most important LLM releases, research breakthroughs, and AI ecosystem news — delivered straight to your inbox.",
  placeholder = "you@example.com",
  buttonText = "Subscribe",
  variant = "section",
}: {
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  variant?: "section" | "footer";
}) {
  const formAction = process.env.NEXT_PUBLIC_NEWSLETTER_ACTION?.trim() || "";
  const isConfigured = Boolean(formAction);

  if (variant === "footer") {
    return (
      <div className="surface-card space-y-5 px-6 py-8 xl:px-0">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow text-white/60">Newsletter</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h3>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-7 text-slate-300">{description}</p>

        <form
          action={isConfigured ? formAction : undefined}
          method="POST"
          target="_blank"
          className="flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="newsletter-footer" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-footer"
            type="email"
            name="email"
            placeholder={placeholder}
            required
            disabled={!isConfigured}
            className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
          />
          <button
            type="submit"
            disabled={!isConfigured}
            className="shrink-0 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            {buttonText}
          </button>
        </form>
        {!isConfigured ? (
          <p className="text-xs text-slate-500">
            Newsletter signup is not configured yet. Set `NEXT_PUBLIC_NEWSLETTER_ACTION` to enable this form.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="hero-shell space-y-6 px-6 py-10 sm:px-8 sm:py-12 xl:px-0">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow text-white/60">Newsletter</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h2>
        </div>
      </div>

      <p className="max-w-2xl text-base leading-7 text-slate-300">{description}</p>

      <form
        action={isConfigured ? formAction : undefined}
        method="POST"
        target="_blank"
        className="flex max-w-md flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="newsletter-hero" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-hero"
          type="email"
          name="email"
          placeholder={placeholder}
          required
          disabled={!isConfigured}
          className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
        />
        <button
          type="submit"
          disabled={!isConfigured}
          className="button-primary shrink-0"
        >
          {buttonText}
        </button>
      </form>

      <p className="text-xs text-slate-500">
        {isConfigured
          ? "No spam, ever. Unsubscribe anytime."
          : "Set NEXT_PUBLIC_NEWSLETTER_ACTION to enable newsletter signup."}
      </p>
    </section>
  );
}
