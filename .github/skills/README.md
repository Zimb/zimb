# Skills techniques — Projet Zimb

> **6 skills** (`SKILL.md`) qui contiennent le contexte technique spécifique pour coder efficacement sur le projet Zimb. Chaque skill pointe vers la doc officielle à jour + des patterns Zimb-spécifiques + les pièges connus.

## Sommaire

| # | Skill | Dossier | Couverture |
|---|---|---|---|
| 1 | **Flutter Web Zimb** | [flutter-web-zimb/](flutter-web-zimb/SKILL.md) | Material 3 web, build Cloudflare Pages, Inter/JetBrainsMono |
| 2 | **Cloudflare Workers Modern** | [cloudflare-workers-modern/](cloudflare-workers-modern/SKILL.md) | Durable Objects nouvelle API, Workflows, Hono v4 |
| 3 | **Stripe Connect Escrow** | [stripe-connect-escrow/](stripe-connect-escrow/SKILL.md) | Express accounts, capture+transfer, 48h SLA |
| 4 | **GitHub Apps `@zimb-bot`** | [github-apps-zimb-bot/](github-apps-zimb-bot/SKILL.md) | Fine-grained perms, ephemeral access, webhooks |
| 5 | **Airtable Scripting** | [airtable-scripting/](airtable-scripting/SKILL.md) | Metadata API, Scripting runtime, automations |
| 6 | **VS Code Chat Extensions** | [vscode-chat-extensions/](vscode-chat-extensions/SKILL.md) | Chat Participant API, webviews, slash commands |

## Quand un skill est invoqué

Un agent ou le chat principal charge un skill **automatiquement** quand sa `description` matche la tâche. Par exemple :

- L'agent **Flutter Web Kanban** charge `flutter-web-zimb/` dès qu'il génère un widget Material 3 web.
- L'agent **Backend Middleware** charge `cloudflare-workers-modern/` dès qu'il touche au Worker.
- L'agent **Stripe Connect Paiements** charge `stripe-connect-escrow/` pour toute la logique financière.

## Convention

Chaque `SKILL.md` contient :

1. **Description** (1-2 phrases) — quand ce skill est pertinent
2. **Stack cible** — versions, packages, SDKs
3. **Doc officielle** — 3-5 URLs versionnées vers la source canonique
4. **Patterns Zimb** — snippets de code spécifiques au projet
5. **Pièges connus** — erreurs classiques à éviter
6. **Checklist pré-codage** — 3-5 points à valider avant d'écrire

## Maintenance

- **Date de mise à jour** dans le frontmatter YAML de chaque skill.
- Quand une dépendance majeure change (ex: Flutter 4.0, Stripe 2025-XX API), mettre à jour le skill correspondant **AVANT** de coder.
- Les skills sont **lecture seule** par défaut — les modifier doit être une décision explicite du fondateur ou de l'agent Documentation Produit.
