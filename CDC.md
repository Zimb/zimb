# Zimb(.app) — Cahier des Charges (CDC)

> **Plateforme de bounty debugging reliant les *Vibe Coders* (juniors boostés à l'IA) à des seniors capables de débloquer les bugs typiques causés par l'IA.**
>
> Document contractuel de cadrage pour prestataires externes ou équipe interne.
> Version : 1.0 — 2026-09-16
>
> [English version available here](CDC.en.md)

---

## Sommaire

1. [Contexte & Présentation du Projet](#1-contexte--présentation-du-projet)
2. [Périmètre & Fonctionnalités](#2-périmètre--fonctionnalités)
3. [Spécifications Techniques & Contraintes](#3-spécifications-techniques--contraintes)
4. [UI/UX & Livrables Graphiques](#4-uiux--livrables-graphiques)
5. [Organisation, Calendrier & Budget](#5-organisation-calendrier--budget)
6. [Annexes](#6-annexes)

---

## 1. Contexte & Présentation du Projet

### 1.1 Présentation de la marque

| Item | Valeur |
|---|---|
| **Nom** | Zimb |
| **Domaine principal** | zimb.app |
| **Sous-domaines** | `app.zimb.app` (Flutter Web seniors), `api.zimb.app` (middleware) |
| **Statut** | Projet en phase de cadrage (pré-MVP) |
| **Fondateurs** | Équipe Zimb (3 personnes) |
| **Contact** | contact@zimb.app |

Zimb est une marketplace de **debugging as a service** ciblant la nouvelle génération de développeurs assistés par IA générative.

### 1.2 Problème à résoudre

**Constat terrain :**

- L'essor des « Vibe Coders » (développeurs juniors utilisant Cursor, Copilot, Cline, Windsurf) génère un volume massif de bugs **non résolvables par l'IA seule** : erreurs CORS, race conditions, configuration d'environnement, dépendances circulaires, etc.
- Ces développeurs sont **bloqués** entre l'IA qui tourne en rond et l'embauche d'un freelance senior (coûteux, lent, pas spécialisé debug court).
- Les seniors qualifiés, eux, **perdent du temps** en prospection sur des missions longues, alors qu'ils pourraient résoudre 5–10 micro-bugs par jour.

**Opportunité :** un modèle de **bounty court (45 min)** avec pré-authorisation Stripe et arbitrage intégré.

### 1.3 Objectifs visés

| # | Objectif | KPI cible (à 6 mois) |
|---|---|---|
| **O1** | Lancer un MVP fonctionnel sur les 3 canaux (web, extension VS Code, app seniors) | Taux d'uptime ≥ 99 % |
| **O2** | Atteindre le product-market fit sur le segment Vibe Coders | ≥ 100 tickets validés / mois |
| **O3** | Constituer un pool de 50 seniors actifs | ≥ 30 % de rétention mensuelle |
| **O4** | Garantir la sécurité financière (escrow Stripe) | 0 incident de fonds perdus |
| **O5** | Rentabiliser le modèle (commission 20 %) | GMV ≥ 5 000 €/mois |

### 1.4 Hors-périmètre (Won't have — V1)

- Application mobile native (iOS/Android) — reporté V2.
- Multi-langue — FR/EN uniquement en V1.
- Système de réputation publique avec reviews.
- Intégration directe avec d'autres IDE (JetBrains, Sublime) — uniquement VS Code en V1.

---

## 2. Périmètre & Fonctionnalités

### 2.1 Personas / Utilisateurs

| Persona | Rôle | Canal principal | Besoin clé |
|---|---|---|---|
| **Léo — Vibe Coder** | Junior + IA | Extension VS Code + Formulaire web | Débloquer un bug en < 1 h sans embaucher |
| **Sarah — Senior** | Développeur expert | `app.zimb.app` (Flutter Web) | Monétiser son expertise, flux passif |
| **Marc — Reviewer** | Senior staff Zimb | Interface web dédiée `/review` | Arbitrer les litiges, percevoir une commission |
| **Admin Zimb** | Équipe interne | Dashboard interne | Piloter l'activité, gérer les escalades SLA |

### 2.2 User Stories principales (extrait)

#### Vibe Coder

- *En tant que* **Vibe Coder**, *je veux* créer un ticket via `@zimb` dans Copilot avec contexte auto-rempli, *afin de* décrire mon bug en moins de 30 secondes.
- *En tant que* **Vibe Coder**, *je veux* pré-payer mon bounty par carte, *afin de* garantir que le senior sera rémunéré.
- *En tant que* **Vibe Coder**, *je veux* cliquer sur **« Quick Win ! »** dès que le bug est résolu, *afin de* valider le paiement instantanément.
- *En tant que* **Vibe Coder**, *je veux* ouvrir un litige en cas de non-résolution, *afin d'* être remboursé.

#### Senior

- *En tant que* **Senior**, *je veux* voir les tickets disponibles sous forme de post-it colorés par urgence, *afin de* prioriser rapidement.
- *En tant que* **Senior**, *je veux* claim un ticket en un clic, *afin de* bloquer 45 min de travail exclusif.
- *En tant que* **Senior**, *je veux* être invité automatiquement sur le dépôt GitHub du ticket, *afin de* commencer à coder immédiatement.
- *En tant que* **Senior**, *je veux* être notifié quand un autre senior claim un ticket (« Match ! »), *afin de* réagir plus vite sur les prochains.
- *En tant que* **Senior**, *je veux* recevoir mon payout en moins de 7 jours après validation, *afin d'* avoir une trésorerie prévisible.

#### Reviewer

- *En tant que* **Reviewer**, *je veux* recevoir un ticket en litige avec diff GH + description, *afin de* statuer en moins de 48 h.
- *En tant que* **Reviewer**, *je veux* percevoir 20 % du bounty sur litige gagné par le client, *afin d'* être rémunéré pour mon arbitrage.

### 2.3 Matrice MSCW des fonctionnalités

#### Must have (MVP — indispensable au lancement)

| # | Fonctionnalité | Module | Priorité |
|---|---|---|---|
| M1 | Authentification GitHub OAuth | Auth | P0 |
| M2 | Création de ticket via formulaire web (`zimb.app/submit`) | Web | P0 |
| M3 | Création de ticket via extension VS Code (`@zimb`) | Extension | P0 |
| M4 | Kanban Flutter Web seniors (`app.zimb.app`) | Seniors | P0 |
| M5 | Mécanique Lock & Timer 45 min + gestion concurrence | Middleware | P0 |
| M6 | Pré-authorisation Stripe Connect (`capture_method: manual`) | Paiement | P0 |
| M7 | GitHub App `@zimb-bot` — invitation/révocation auto | GitHub | P0 |
| M8 | Création dépôt privé `zimb-<ticketId>` | GitHub | P0 |
| M9 | Bouton **« Quick Win ! »** (capture + transfer) | Paiement | P0 |
| M10 | Auto-validation à 24 h sans réponse client | Paiement | P0 |
| M11 | Notification « Match ! » WebSocket | Realtime | P0 |
| M12 | SLA Litige 48 h + escalation auto (3 niveaux) | Litiges | P0 |
| M13 | Arbitrage P2P par reviewer (3 verdicts) | Litiges | P0 |
| M14 | Landing page `zimb.app` (vitrine + recrutement seniors) | Marketing | P0 |

#### Should have (important, non bloquant)

| # | Fonctionnalité | Module | Priorité |
|---|---|---|---|
| S1 | Notifications email (Resend/Postmark) à chaque étape | Notif | P1 |
| S2 | Webhook Discord/Slack pour le client | Notif | P1 |
| S3 | Filtres Kanban (langage, bounty min, urgence) | Seniors | P1 |
| S4 | Mode sombre / clair sur `app.zimb.app` | UI | P1 |
| S5 | Cron expiration timer toutes les 60 s | Middleware | P1 |
| S6 | Page `/track/<ticketId>` pour suivre un ticket | Web | P1 |
| S7 | Audit log des révocations GH | Sécurité | P1 |
| S8 | Buffer offline 30 min pour reconnexion tardive | Realtime | P1 |

#### Could have (bonus, à arbitrer)

| # | Fonctionnalité | Module | Priorité |
|---|---|---|---|
| C1 | Système de réputation seniors (note 1-5) | Réputation | P2 |
| C2 | Badges / niveaux (Junior, Senior, Staff) | Gamification | P2 |
| C3 | Multi-langue (FR/EN/ES) | i18n | P2 |
| C4 | Dashboard finance pour seniors (historique payouts) | Comptabilité | P2 |
| C5 | Sondage NPS post-validation | Feedback | P2 |
| C6 | Intégration Cursor (en plus de Copilot) | Extension | P2 |

#### Won't have (exclu V1)

| # | Fonctionnalité | Justification |
|---|---|---|
| W1 | App mobile native (iOS/Android) | Reporté V2 — Flutter Web suffit en V1 |
| W2 | Support JetBrains / Sublime | Marché secondaire vs VS Code |
| W3 | Vidéo-call intégrée senior/client | Overhead produit trop élevé pour V1 |
| W4 | IA interne de pré-tri des tickets | Le triage est manuel V1, IA en V2 |
| W5 | White-label B2B | Focus B2C V1 |

---

## 3. Spécifications Techniques & Contraintes

### 3.1 Architecture cible

| Composant | Techno imposée | Justification |
|---|---|---|
| Landing `zimb.app` | Astro ou Next.js (statique) | SEO, perf edge |
| App seniors `app.zimb.app` | **Flutter Web** | Demande explicite fondateur |
| Middleware `api.zimb.app` | **Cloudflare Worker** (TS, Hono/Itty) | Latence edge, gratuit < 100k req/j |
| Source de vérité | **Airtable** | Demande explicite fondateur, MVP rapide |
| Paiements | **Stripe Connect** (Express accounts) | Escrow + split commission |
| GitHub | **GitHub App `@zimb-bot`** | Invitation/révocation programmatique |
| Cron jobs | Cloudflare Workers Cron Triggers | Pas de serveur à maintenir |
| Realtime | WebSocket natif (Cloudflare Durable Objects) | Kanban temps réel |
| Auth | GitHub OAuth | Audience dev-native |
| Email | Resend ou Postmark | Délivrabilité devs |
| Analytics | Plausible | RGPD-friendly |

### 3.2 Stack synthétique

```
┌─────────────────────────────────────────────────────────────┐
│  FRONT                                                      │
│  - Astro/Next.js     (zimb.app)                             │
│  - Flutter Web       (app.zimb.app)                         │
│  - VS Code Extension (TypeScript, VS Code API + Copilot)    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  MIDDLEWARE (api.zimb.app)                                  │
│  - Cloudflare Worker (Hono/Itty router)                     │
│  - Durable Objects (Kanban realtime sessions)               │
│  - Cron Triggers (timer expiry, auto-validate, SLA)         │
└─────┬───────────┬─────────────┬──────────────┬─────────────┘
      │           │             │              │
      ▼           ▼             ▼              ▼
   Airtable    Stripe       GitHub         Email
   (DB)        Connect      (@zimb-bot)    (Resend)
```

### 3.3 Intégrations & API tierces

| Service | Type | Usage | Auth |
|---|---|---|---|
| **Airtable** | REST API | CRUD tickets, users, claims, ledger | API Key (PAT) |
| **Stripe Connect** | REST + Webhooks | PaymentIntent, capture, transfer, Connect accounts | Secret Key + Webhook Signing |
| **GitHub** | REST + GraphQL | Création repos, invite/revoke collabs, branches, PRs | GitHub App + Private Key (RS256) |
| **Resend / Postmark** | REST | Emails transactionnels | API Key |
| **Plausible** | JS snippet | Analytics anonymisées | Domain config |

### 3.4 Routes API principales

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/tickets` | Créer un ticket (canal `web` ou `vscode`) |
| `GET` | `/tickets` | Liste paginée avec filtres |
| `POST` | `/tickets/:id/claim` | Claim (atomique) |
| `POST` | `/tickets/:id/deliver` | Marquer livré |
| `POST` | `/tickets/:id/validate` | « Quick Win ! » |
| `POST` | `/tickets/:id/dispute` | Ouvrir litige |
| `POST` | `/tickets/:id/review` | Décision reviewer |
| `GET` | `/me/tickets` | Tickets du senior |
| `GET` | `/track/:ticketId` | Suivi public client |
| `GET` | `/webhooks/stripe` | Webhook Stripe |
| `GET` | `/webhooks/github` | Webhook GitHub |

### 3.5 Sécurité

#### Authentification & autorisation

- **Seniors** : GitHub OAuth → JWT signé (HS256), expiration 7 j, refresh token.
- **Clients** : email magic link (Resend) → JWT avec claim `role: client`, scope limité à ses propres tickets.
- **Reviewers** : rôle spécial `role: reviewer` requis pour `/tickets/:id/review`.

#### Conformité RGPD

- Données personnelles minimales (email + login GitHub).
- Pas de tracking publicitaire, uniquement Plausible.
- Droit à l'effacement : endpoint `DELETE /me` → purge Airtable + suppression compte Stripe Connect.
- Logs d'audit conservés 12 mois maximum.

#### Performance

| Métrique | Cible |
|---|---|
| `time-to-interactive` landing `zimb.app` | < 1,5 s (P75) |
| Latence `POST /tickets` | < 300 ms (P95) |
| Latence broadcast WebSocket Kanban | < 200 ms (P95) |
| Disponibilité | ≥ 99,5 % (hors maintenance planifiée) |

#### Sécurité GitHub

- `@zimb-bot` est la **seule entité** pouvant gérer les accès sur les repos `zimb-*`.
- Aucun humain Zimb n'a d'accès permanent en prod.
- Logs d'invitation/révocation conservés 24 mois pour audit.

### 3.6 Contraintes financières (rappel)

- **Bounty minimum** : 10 €.
- **Bounty maximum** : 500 € (au-delà → contact direct Zimb).
- **Commission Zimb** : 20 % (irréductible V1).
- **Pré-auth Stripe** : durée de vie 7 j → contrainte SLA litige ≤ 48 h.
- **Payout** : capture + transfer sous 24 h post-validation.

---

## 4. UI/UX & Livrables Graphiques

### 4.1 Charte graphique

| Item | Spécification |
|---|---|
| **Logo** | À fournir par le fondateur (placeholder temporaire acceptable en attendant) |
| **Typographie principale** | `Inter` (sans-serif, dev-friendly) |
| **Typographie code** | `JetBrains Mono` ou `Fira Code` |
| **Palette primaire** | Indigo `#4F46E5` (CTA, boutons primaires) |
| **Palette urgence** | Vert `#10B981`, Jaune `#F59E0B`, Rouge `#EF4444`, Violet `#8B5CF6` |
| **Neutres** | Slate 50–900 (Tailwind palette) |
| **Iconographie** | Lucide Icons (open source, cohérent avec Inter) |
| **Tonalité** | Moderne, tech, légèrement playful (« swoosh » au claim, emojis dans les toasts) |

### 4.2 Livrables UX attendus

| Livrable | Responsable | Deadline |
|---|---|---|
| Wireframes basse fidélité (landing + form submit) | **À créer** par le prestataire | Fin Phase 1 |
| Maquettes Figma HD (toutes les vues) | **À créer** par le prestataire | Fin Phase 1 |
| Design system (tokens, composants) | **À créer** par le prestataire | Fin Phase 1 |
| Maquettes Flutter Web (Kanban + modale + Mes tickets) | **À créer** par le prestataire | Phase 2 |
| Icônes et illustrations custom | **Optionnel** (Lucide suffit V1) | Phase 6 |

### 4.3 Vues critiques à designer

1. **Landing `zimb.app`** — Hero + 3 étapes + CTA seniors + footer.
2. **Formulaire `/submit`** — 7 champs + slider bounty + Stripe embed.
3. **Kanban `app.zimb.app`** — Post-it colorés, swipe/scroll, modale détail.
4. **« Mes tickets »** — Liste avec timer et statut.
5. **Page `/track/:ticketId`** — Vue publique client (statut simplifié).
6. **Interface reviewer `/review`** — Diff GH + description + 3 boutons verdict.

---

## 5. Organisation, Calendrier & Budget

### 5.1 Équipe & gouvernance

| Rôle | Personne / Type | Responsabilité |
|---|---|---|
| **Product Owner** | Fondateur principal | Validation des US, priorisation MSCW |
| **Tech Lead** | Fondateur ou prestataire senior | Architecture, code review, dette technique |
| **Lead Dev Front** | Prestataire | Flutter Web + landing + extension |
| **Lead Dev Back** | Prestataire | Middleware Worker + intégrations |
| **Designer UX/UI** | Prestataire | Wireframes + Figma + design system |
| **QA** | Interne fondateur | Tests fonctionnels + UAT |
| **DevOps** | Fondateur (léger) | Cloudflare, GitHub App, monitoring |

**Décisionnaire principal (RACI) :** Fondateur principal — R (Responsable), A (Accountable) sur tous les axes.

### 5.2 Planning / Jalons clés

| Jalon | Date cible | Livrables |
|---|---|---|
| **J0** — Kickoff | T+0 | CDC signé, accès repo, Slack équipe, Airtable créé |
| **J+2 sem** — Design | T+2 sem | Wireframes + maquettes Figma validées |
| **J+6 sem** — MVP backend | T+6 sem | Middleware + Airtable + Stripe Connect + GitHub App |
| **J+8 sem** — MVP seniors | T+8 sem | Flutter Web Kanban + Lock & Timer fonctionnels |
| **J+10 sem** — MVP canaux | T+10 sem | Formulaire web + extension VS Code |
| **J+12 sem** — Bêta privée | T+12 sem | 10 seniors + 20 Vibe Coders, feedback |
| **J+14 sem** — Litiges + SLA | T+14 sem | Système reviewer + escalation auto |
| **J+16 sem** — Launch public | T+16 sem | Marketing landing ON, ProductHunt, ouverture inscriptions |

> ⚠️ Le planning ci-dessus suppose **2 développeurs full-stack + 1 designer à mi-temps**. Ajuster en conséquence si l'équipe est plus réduite.

### 5.3 Budget — Fourchette indicative

| Poste | Estimation basse | Estimation haute | Commentaire |
|---|---|---|---|
| **Designer UX/UI** (2 mois) | 6 000 € | 10 000 € | Wireframes + Figma + design system |
| **Lead Dev Front** (4 mois) | 18 000 € | 28 000 € | Flutter Web + landing Astro + extension |
| **Lead Dev Back** (4 mois) | 18 000 € | 28 000 € | Worker + intégrations Stripe/GH/Airtable |
| **Infra & services** (1ère année) | 500 € | 1 500 € | Cloudflare + Airtable + Resend + domaine |
| **GitHub Team** (1ère année) | 400 € | 400 € | Forfait 4 €/user/mois × 10 places |
| **Stripe** | 1,5 % + 0,25 €/tx | Idem | Commission Stripe standard |
| **Buffer (15 %)** | + 6 500 € | + 10 000 € | Imprévus |
| **TOTAL FOURCHETTE** | **~50 000 €** | **~80 000 €** | Hors fondateurs |

### 5.4 Critères d'acceptation du MVP

Le MVP est considéré comme livrable lorsque **toutes** les conditions suivantes sont réunies :

- [ ] Un Vibe Coder peut créer un ticket via `zimb.app/submit` ET via `@zimb` dans VS Code.
- [ ] Le paiement est pré-authorisé mais **pas débité** tant que le bug n'est pas résolu.
- [ ] Un senior authentifié peut voir, claim et travailler un ticket en < 45 min.
- [ ] Le ticket disparaît du Kanban public dès qu'il est claim (autres seniors).
- [ ] La notification « Match ! » est pushée aux autres seniors en < 1 s.
- [ ] Le dépôt GH privé est créé automatiquement et le senior est invité au claim.
- [ ] Le « Quick Win ! » capture le paiement + transfère 80 % au senior + révoque l'accès GH.
- [ ] L'auto-validation 24 h fonctionne en l'absence de réponse client.
- [ ] Un litige peut être ouvert, assigné, et résolu en < 48 h (SLA).
- [ ] Le taux d'incident financier (fonds perdus) est de **0** sur la durée du pilote.

---

## 6. Annexes

### A. Documents de référence

| Document | Chemin | Statut |
|---|---|---|
| Spécifications produit détaillées | [SPECIFICATIONS.md](SPECIFICATIONS.md) | ✅ Validé |
| Schéma base Airtable | §A de SPECIFICATIONS.md | ✅ Validé |
| Variables d'environnement Worker | §B de SPECIFICATIONS.md | ✅ Validé |
| Glossaire | §C de SPECIFICATIONS.md | ✅ Validé |

### B. Glossaire express

- **Vibe Coder** : développeur junior boosté à l'IA générative (Cursor, Copilot, etc.).
- **Bounty** : prix fixé par le demandeur pour la résolution d'un bug.
- **Lock & Timer** : appropriation exclusive d'un ticket par un senior pour 45 min.
- **Quick Win !** : validation manuelle instantanée par le client.
- **Match !** : notification push envoyée aux seniors quand un post-it est décollé.
- **Reviewer** : senior staff Zimb qui arbitre les litiges.
- **Channel** (`web` / `vscode`) : canal de création d'un ticket.

### C. Signataires

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Product Owner (Zimb) | _________________ | ____/____/______ | _________________ |
| Prestataire principal | _________________ | ____/____/______ | _________________ |
| Designer (si externalisé) | _________________ | ____/____/______ | _________________ |

---

*Document rédigé le 2026-09-16 — À valider avant kickoff.*
