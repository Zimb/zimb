# Zimb(.app) — Bounty debugging for Vibe Coders

> **Plateforme de bounty debugging reliant les *Vibe Coders* (juniors boostés à l'IA) à des seniors capables de débloquer les bugs typiques causés par l'IA.**

## 🌐 Sous-domaines

| URL | Rôle | Stack |
|---|---|---|
| [zimb.app](https://zimb.app) | Landing marketing + recrutement seniors | Astro (static) |
| [app.zimb.app](https://app.zimb.app) | Kanban seniors (post-it, Lock & Timer) | Flutter Web |
| [api.zimb.app](https://api.zimb.app) | Middleware d'orchestration | Cloudflare Worker (Hono) |
| _(marketplace)_ | Extension VS Code / Copilot `@zimb` | TypeScript |

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

## 🚀 Quick start

```bash
# 1. Cloner
git clone https://github.com/zimb-app/zimb.git
cd zimb

# 2. Installer Node 20+
nvm use

# 3. Installer les dépendances du monorepo
npm install

# 4. Copier les secrets de dev
cp packages/worker/dev.vars.example packages/worker/.dev.vars
# → remplir les clés Stripe test, Airtable PAT, GitHub App private key

# 5. Lancer un package en dev
npm run dev -w @zimb/worker      # api.zimb.app → http://localhost:8787
npm run dev -w @zimb/landing     # zimb.app → http://localhost:5173
# Pour Flutter Web :
cd packages/app-web && flutter pub get && flutter run -d chrome
# Pour extension VS Code :
code packages/extension && # press F5
```

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
