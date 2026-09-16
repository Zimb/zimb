# `@zimb/landing` — zimb.app

> Marketing landing page for Zimb — hosted at zimb.app via Cloudflare Pages.

## Stack

- **Framework**: [Astro](https://astro.build) 4.x (static site, zero JS by default)
- **Styling**: Scoped CSS + CSS custom properties
- **Typography**: Inter (UI) + JetBrains Mono (code)
- **Analytics**: Plausible (RGPD-friendly)

## Local development

```bash
# 1. Install dependencies (from monorepo root)
npm install

# 2. Start dev server
npm run dev -w @zimb/landing
# → http://localhost:5173
```

## Project structure

```
src/
├── pages/
│   ├── index.astro       # Hero + How it works + Senior CTA + Footer
│   ├── submit.astro      # (TODO) Web form for ticket creation
│   ├── track/[id].astro  # (TODO) Client ticket tracking
│   └── seniors/apply.astro # (TODO) Senior application form
├── layouts/
│   └── Layout.astro      # Base HTML + global tokens
└── components/
    ├── Hero.astro
    ├── HowItWorks.astro
    ├── SeniorCTA.astro
    └── Footer.astro
```

## Design tokens

Defined in `src/layouts/Layout.astro` as CSS custom properties. See SPECIFICATIONS.md §3.4.

| Token | Value |
|---|---|
| `--color-primary` | `#4F46E5` |
| `--color-urgent-low` | `#10B981` |
| `--color-urgent-medium` | `#F59E0B` |
| `--color-urgent-high` | `#EF4444` |
| `--color-urgent-critical` | `#8B5CF6` |
| `--font-primary` | `Inter` |
| `--font-code` | `JetBrains Mono` |

## Deploy

Build output (`dist/`) is deployed to Cloudflare Pages:

- Production: https://zimb.app
- Staging: https://staging.zimb.app

```bash
npm run build -w @zimb/landing
# Then `wrangler pages deploy dist`
```

## SEO

- Sitemap auto-generated via `@astrojs/sitemap`.
- Open Graph + Twitter Card meta in `Layout.astro`.
- `robots.txt` + `favicon.svg` to add in `public/`.
