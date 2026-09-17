# Zimb(.app) — Bounty debugging for Vibe Coders

> **Plateforme de bounty debugging reliant les *Vibe Coders* (juniors boostés à l'IA) à des seniors capables de débloquer les bugs typiques causés par l'IA.**

---

## ⚡ Try it in 30 seconds

**The fastest path to a working `@zimb` in VS Code.** No clone, no build, no Node.js.

```bash
# One command — assumes you have VS Code 1.94+ with `code` on your PATH
code --install-extension https://github.com/Zimb/zimb/releases/download/v0.1.0/zimb-vscode-0.1.0.vsix --force
```

Then in VS Code:

1. **Reload the window** — `Ctrl/Cmd + Shift + P` → "Developer: Reload Window"
2. **Open a folder** that's a git clone of a GitHub repo you own (any repo works)
3. **Open Copilot Chat** — `Ctrl/Cmd + Shift + I`
4. **Type:** `@zimb /bounties` — you should see existing bounties (or an empty list)

That's it. The sidebar Zimb icon (left activity bar) shows your bounties + a persistent notifications badge.

> **No GitHub OAuth?** The extension prompts you to sign in when you first use a command that needs it (`/post`, `/status`).

---

## 🌐 Subdomains

| URL | Role | Stack |
|---|---|---|
| [zimb.app](https://zimb.app) | Marketing landing + senior recruitment | Astro (static) |
| [app.zimb.app](https://app.zimb.app) | Senior Kanban (post-it, Lock & Timer) | Flutter Web |
| [api.zimb.app](https://api.zimb.app) | Orchestration middleware | Cloudflare Worker (Hono) |
| [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zimb.zimb-vscode) | `@zimb` chat participant | TypeScript |

## 📦 Monorepo

```
zimb/
├── packages/
│   ├── worker/      # @zimb/worker — Cloudflare Worker (api.zimb.app)
│   ├── app-web/     # @zimb/app-web — Flutter Web Kanban (app.zimb.app)
│   ├── extension/   # @zimb/extension — VS Code / Copilot @zimb chat
│   └── landing/     # @zimb/landing — Astro landing (zimb.app)
├── SPECIFICATIONS.md # Spec technique & produit exhaustive
├── CDC.md            # Cahier des charges contractuel
├── recettes/         # 64 scénarios Gherkin + template bug
├── FOUNDER_NOTES.md  # Notes originales du fondateur (source de vérité v0)
└── .github/
    ├── agents/       # 8 agents custom Copilot spécialisés
    └── workflows/    # CI GitHub Actions
```

## 🚀 Try it (1 minute, no clone)

See [⚡ Try it in 30 seconds](#-try-it-in-30-seconds) above.

If you want to **compose a bounty** (not just look at them), the flow is:

1. `@zimb /redact <your problem in plain English or French> [-l en] [-u high] [-b 50]`
   → see a structured preview, nothing posted yet
2. `@zimb /post`
   → publishes the preview to GitHub on your current repo

Try it on a throwaway repo first.

---

## 🛠 Dev setup (for contributors)

**Only needed if you want to modify the extension or the Worker.**

### Prerequisites

- Node.js 20+ (`nvm use 20` if you use nvm)
- npm 10+
- Git
- VS Code 1.94+ (for extension development)
- A GitHub account with a repo you can push to

### Clone and build

```bash
gh repo clone Zimb/zimb
cd zimb
npm install                # monorepo root
npx turbo run build        # build every package
```

### Run each package in dev mode

```bash
npm run dev -w @zimb/worker      # api.zimb.app → http://localhost:8787
npm run dev -w @zimb/landing     # zimb.app → http://localhost:5173

# Extension:
code packages/extension          # opens in a new VS Code window, press F5 to launch the Extension Dev Host

# Flutter Web Kanban:
cd packages/app-web && flutter pub get && flutter run -d chrome
```

### Dev secrets

The Worker needs API keys to talk to Stripe / Airtable / GitHub. For local dev:

```bash
cp packages/worker/dev.vars.example packages/worker/.dev.vars
# Edit and fill in:
#   STRIPE_SECRET_KEY (test mode)
#   AIRTABLE_API_KEY
#   GITHUB_APP_ID + GITHUB_PRIVATE_KEY
#   JWT_SECRET
```

The extension uses VS Code's built-in GitHub authentication — no secrets needed in dev.

---

## 🧪 Test the `@zimb` chat commands

Once installed, try each slash command. See [docs/CHAT_COMMANDS.md](docs/CHAT_COMMANDS.md) for the full reference.

| Command | What it does |
|---|---|
| `@zimb /bounties` | List bounties in the current repo (read-only) |
| `@zimb /redact <bug>` | Compose a draft locally, no network call |
| `@zimb /fix <hint>` | Compose using your chat history as troubleshooting context |
| `@zimb /post` | Publish the last draft to GitHub |
| `@zimb /discard` | Throw away the current draft |
| `@zimb /status T-XXXX` | Check a ticket via api.zimb.app |
| `@zimb /notif` | Show the notifications poller status |

## 🤖 Agents Copilot spécialisés

Le projet utilise **8 agents custom** (`.github/agents/`) qui orchestrent le travail :

| Agent | Domaine |
|---|---|
| **Backend Middleware** | Cloudflare Worker, routes REST, Airtable, Durable Objects |
| **Flutter Web Kanban** | UI seniors, post-it, Lock & Timer, Match ! |
| **Stripe Connect Paiements** | Escrow, capture, transfer, commission 20 % |
| **GitHub Bot** | App `@zimb-bot`, invite/revoke collaborateurs |
| **Litiges & Reviewer** | SLA 48 h, escalation, verdicts |
| **VS Code Extension** | Chat participant `@zimb`, détection langages |
| **QA & Recette** | 64 scénarios Gherkin, bug reports, MVP gate |
| **Documentation Produit** | SPECIFICATIONS, CDC, recettes, landing copy |

Voir [`.github/agents/README.md`](.github/agents/README.md) pour les détails.

## 🧪 Tests & qualité

```bash
# Lint + type-check + tests sur tous les packages
npm run lint
npm run type-check
npm test

# Formatage
npm run format

# Audit de la documentation (recettes) — utiliser l'agent QA & Recette
```

## 📚 Documentation

| Doc | Audience | Usage |
|---|---|---|
| [SPECIFICATIONS.md](SPECIFICATIONS.md) | Tech, fondateurs | Source de vérité (comment ça marche) |
| [CDC.md](CDC.md) | Prestataires, direction | Cadrage (quoi, quand, combien) |
| [recettes/](recettes/) | QA, devs | 64 scénarios E2E (ça marche ?) |
| [.github/agents/](.github/agents/) | Tous | Workflow IA (qui fait quoi) |
| [FOUNDER_NOTES.md](FOUNDER_NOTES.md) | Tous | Notes originales v0 (intentions brutes) |

## 🔒 Sécurité

Voir [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité (`security@zimb.app`).

- **RGPD** : conformes, droit à l'effacement via `DELETE /me`
- **GitHub access** : ephemeral via `@zimb-bot` (jamais d'accès permanent)

## 📅 Statut du projet

> **Phase :** préparation / scaffolding  
> **Complétude :** ~70 % de la préparation, ~0 % du code en prod  
> **Roadmap :** voir [SPECIFICATIONS.md §7](SPECIFICATIONS.md#7-roadmap-de-développement)

## 📜 Licence

UNLICENSED — proprietary, all rights reserved.
