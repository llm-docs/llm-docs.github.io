## LLM-Docs

A maintainable Next.js site for the `LLM-Docs` GitHub organization.

It is designed to publish:

- LLM documentation pages
- dated update posts
- model tracking pages
- agent and framework references
- comparison, provider, and topic hub pages generated from structured content

Content lives in markdown files under `content/` and is rendered automatically by the App Router.

## Collections

- `content/docs` for guides and reference docs
- `content/news` for release notes and ecosystem updates
- `content/models` for model profile pages
- `content/agents` for agent tools and frameworks
- `content/automation` for sync status metadata used by the site

Generated content also lands in:

- `content/news/auto` for feed-synced news entries
- `content/models/auto` for feed-synced model announcement pages
- `content/docs/library` for generated docs-library pages

Each file uses frontmatter plus markdown body content.

## Development

```bash
npm run dev
npm run build
npm run lint
npm run lint:content
npm run generate:docs-library
npm run sync:news
npm run sync:models
npm run sync:content
```

Open `http://localhost:3000`.

## How To Add Content

1. Add a new `.md` file in the correct `content/*` folder.
2. Fill in the frontmatter fields used by that collection.
3. The index pages and homepage sections update automatically.

## Content Automation

- `npm run generate:docs-library` regenerates the docs library pages under `content/docs/library`.
- `npm run sync:news` imports the latest feed items into `content/news/auto` and updates `content/automation/news-status.json`.
- `npm run sync:models` imports model-related feed items into `content/models/auto` and updates `content/automation/models-status.json`.
- `npm run sync:models` also writes `content/automation/model-review-report.json` with likely launch candidates that did not match the current keyword filter.
- `npm run sync:content` runs both sync jobs in sequence.
- `.github/workflows/sync-news.yml` runs hourly, validates content, syncs feeds and discovery sources, commits generated changes, and pushes them back to `main`.

Optional search discovery:

- Set `SEARCH_API_PROVIDER=serper` with `SERPER_API_KEY` to enable domain-scoped web search discovery.
- Set `SEARCH_API_PROVIDER=tavily` with `TAVILY_API_KEY` to enable the same flow through Tavily.
- If no search API key is present, the sync falls back to feeds plus official listing-page discovery only.

## Notes

- The app avoids remote font fetching so builds work in restricted environments.
- Markdown rendering uses `next-mdx-remote/rsc` with GFM and code highlighting.
- Branding assets live in `public/`, including `public/logo.png`.
- Automatic news syncing is configured in `.github/workflows/sync-news.yml`.
- Automatic model-announcement syncing is also configured in `.github/workflows/sync-news.yml`.
- News sources can be adjusted in `config/news-sources.mjs`.
- Model sources can be adjusted in `config/model-sources.mjs`.
- The generated docs library is created by `scripts/generate-docs-library.mjs`.
- GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml`.
- The current config assumes this repository is the org site: `LLM-Docs.github.io`.
