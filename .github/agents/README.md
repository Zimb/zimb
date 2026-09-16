# Agents spécialisés — Projet Zimb

> **8 agents custom (`.agent.md`)** dédiés au projet Zimb, organisés par domaine technique ou métier.
> Chaque agent est invocable manuellement (via le sélecteur d'agent) OU automatiquement (par un agent parent via `runSubagent`).

---

## Sommaire des agents

| # | Agent | Fichier | Domaine | Outils autorisés |
|---|---|---|---|---|
| 1 | **Backend Middleware** | `backend-middleware.agent.md` | Cloudflare Worker, orchestration API | read, edit, search, execute |
| 2 | **Flutter Web Kanban** | `flutter-web-kanban.agent.md` | `app.zimb.app`, post-it, Lock & Timer | read, edit, search |
| 3 | **Stripe Connect Paiements** | `stripe-connect-payments.agent.md` | Escrow, capture, transfer, commission 20 % | read, edit, search |
| 4 | **GitHub Bot** | `github-bot.agent.md` | `@zimb-bot`, invitations/révocations | read, edit, search |
| 5 | **Litiges & Reviewer** | `litiges-reviewer.agent.md` | Arbitrage P2P, SLA 48 h, escalation | read, edit, search |
| 6 | **QA & Recette** | `qa-recette.agent.md` | Exécution cahier de recettes, rapport de bug | read, search, edit |
| 7 | **VS Code Extension** | `vscode-extension.agent.md` | Command `@zimb`, détection langages | read, edit, search |
| 8 | **Documentation Produit** | `docs-product.agent.md` | SPECIFICATIONS.md, CDC.md, recettes | read, edit, search |

---

## Comment les utiliser

### Invocation manuelle
Dans VS Code, ouvrir le sélecteur d'agent (icône en haut du panneau Chat) et choisir l'agent voulu.

### Invocation automatique (subagent)
Un agent parent peut déléguer à un sous-agent via sa `description`. Exemple dans un agent parent :

```markdown
When you need to add a new route in the Worker, delegate to the **Backend Middleware** agent.
When you need to validate a user flow, delegate to the **QA & Recette** agent.
```

---

## Documents de référence partagés

Tous les agents s'appuient sur :

| Document | Chemin | Usage |
|---|---|---|
| Spécifications techniques | [../../SPECIFICATIONS.md](../../SPECIFICATIONS.md) | Source de vérité produit/tech |
| Cahier des charges | [../../CDC.md](../../CDC.md) | Périmètre MSCW, planning, budget |
| Cahier de recettes | [../../recettes/](../../recettes/) | 64 scénarios de test E2E |
| Template rapport de bug | [../../recettes/08-template-rapport-bug.md](../../recettes/08-template-rapport-bug.md) | Format standard de bug report |

---

## Principes de conception

1. **Single role** : chaque agent a UN domaine de responsabilité clair.
2. **Minimal tools** : chaque agent n'a que les outils nécessaires à son rôle (pas d'omnibus).
3. **Keyword-rich descriptions** : la description contient les mots-clés de découverte (français + anglais).
4. **Clear boundaries** : chaque agent documente ce qu'il NE fait PAS.
5. **Anti-pattern évité** : pas d'agent « fourre-tout » ; les responsabilités sont strictement découpées.

---

## Maintenance

- Quand une fonctionnalité majeure change dans SPECIFICATIONS.md → vérifier que la description des agents concernés est encore pertinente.
- Quand un nouvel agent est ajouté → l'ajouter à ce README.
- Quand un agent devient obsolète → supprimer le fichier et retirer du sommaire.
