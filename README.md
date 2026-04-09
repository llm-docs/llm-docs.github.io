## LLM-Docs

A maintainable Next.js site for the `LLM-Docs` GitHub organization.

It is designed to publish:

- LLM documentation pages
- dated update posts
- model tracking pages
- agent and framework references

Content lives in markdown files under `content/` and is rendered automatically by the App Router.

## Collections

- `content/docs` for guides and reference docs
- `content/news` for release notes and ecosystem updates
- `content/models` for model profile pages
- `content/agents` for agent tools and frameworks

Each file uses frontmatter plus markdown body content.

## Development

```bash
npm run dev
npm run build
npm run lint
npm run sync:news
```

Open `http://localhost:3000`.

## How To Add Content

1. Add a new `.md` file in the correct `content/*` folder.
2. Fill in the frontmatter fields used by that collection.
3. The index pages and homepage sections update automatically.

## Notes

- The app avoids remote font fetching so builds work in restricted environments.
- Markdown rendering uses `next-mdx-remote/rsc` with GFM and code highlighting.
- Branding assets live in `public/`, including `public/logo.png`.
- Automatic news syncing is configured in `.github/workflows/sync-news.yml`.
- News sources can be adjusted in `config/news-sources.mjs`.
- GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml`.
- The current config assumes this repository is the org site: `LLM-Docs.github.io`.
