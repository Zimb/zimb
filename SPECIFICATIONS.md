# Zimb(.app) — Documentation Technique & Produit

> **Plateforme de bounty debugging reliant les *Vibe Coders* (juniors boostés à l'IA) à des seniors capables de débloquer les bugs typiques causés par l'IA.**

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture & Sous-domaines](#2-architecture--sous-domaines)
3. [Expérience Utilisateur (UI/UX)](#3-expérience-utilisateur-uiux)
4. [Flux Métier & Sécurité](#4-flux-métier--sécurité)
   - 4.0 [Canal Web — Formulaire public](#40-canal-web--formulaire-public-sur-zimbapp)
   - 4.1 [Création de ticket](#41-création-de-ticket)
5. [Modèle Économique & Litiges](#5-modèle-économique--litiges)
   - 5.4 [Garantie SLA Litige — 48 h](#54-garantie-sla-litige--résolution-en-48-h)
6. [Middleware & API (api.zimb.app)](#6-middleware--api-apizimbapp)
7. [Roadmap de Développement](#7-roadmap-de-développement)

---

## 1. Vue d'ensemble

### 1.1 Concept

Zimb.app est un **gestionnaire de tickets sous forme de Kanban** couplé à un **formulaire de création de ticket côté utilisateur**. Le produit connecte deux populations :

| Persona | Rôle | Besoin |
|---|---|---|
| **Vibe Coder** (junior + IA) | Crée des tickets (bounty) | Débloquer un bug que Cursor/Copilot/Cline ne résout pas |
| **Senior** | Claim et résout les tickets | Monétiser son expertise sur des bugs courts et bien décrits |
| **Reviewer** (arbitre) | Intervient en cas de litige | Statuer sur la qualité de la livraison, percevoir la commission |

### 1.2 Système de Bounty

Chaque ticket est une **requête utilisateur à prix fixé par le demandeur** (le *bounty*), avec :

- un **temps de résolution** imparti,
- une **description précise** de ce qui doit être résolu.

Le senior qui claim un ticket dispose d'une fenêtre de temps pour livrer une solution. S'il échoue, le ticket est libéré et le demandeur peut solliciter un autre intervenant.

### 1.3 Proposition de valeur

- **Pour le demandeur (Vibe Coder)** : un Slack/Discord-as-a-service dédié au debug, où il paie seulement quand le bug est réellement résolu (ou automatiquement après 24 h).
- **Pour le senior** : un flux passif de tickets pré-qualifiés, sans prospection, avec capture des fonds pré-autorisée.
- **Pour Zimb** : 20 % de commission sur chaque bounty résolu (sauf cas de litige — voir §5).

---

## 2. Architecture & Sous-domaines

### 2.1 Cartographie des domaines

| Sous-domaine | Hébergement | Techno | Public |
|---|---|---|---|
| `zimb.app` | Cloudflare Pages | Astro / Next.js static | Grand public (landing) |
| `app.zimb.app` | Cloudflare Pages | **Flutter Web** | Seniors authentifiés |
| `api.zimb.app` | Cloudflare Worker | Middleware TS (Hono/Itty) | Interne (orchestration) |
| `github.com/<org>/<repo>` | GitHub | Repos privés par ticket | Senior invité via `@zimb-bot` |
| Marketplace VS Code | Microsoft | Extension Copilot | Vibe Coders |
| Airtable | SaaS | Base Airtable | Source de vérité (tickets, users, ledger) |
| Stripe Connect | SaaS | Express accounts | Paiements escrow |

### 2.2 Schéma d'architecture global

```
                       ┌─────────────────────────────────────┐
                       │        VIBE CODER (junior)          │
                       │  - Landing zimb.app                │
                       │  - Extension VS Code / Copilot     │
                       │    commande @zimb ...              │
                       └──────────────┬──────────────────────┘
                                      │ 1. Crée ticket + bounty
                                      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                  api.zimb.app (Middleware)                   │
   │           Make / n8n / Cloudflare Worker (orchestrateur)     │
   └───┬─────────────┬──────────────────┬──────────────┬──────────┘
       │             │                  │              │
       │ 2a          │ 2b               │ 2c           │ 2d
       ▼             ▼                  ▼              ▼
  ┌─────────┐  ┌────────────┐   ┌─────────────┐  ┌──────────────┐
  │ Airtable│  │ Stripe     │   │ GitHub API  │  │ app.zimb.app │
  │  (DB)   │  │ Connect    │   │ (@zimb-bot) │  │ (Flutter Web)│
  │ Tickets │  │ Pre-auth   │   │ Invite/revoke│ │  Kanban      │
  │ Users   │  │ Capture    │   │ Branch/PR   │  │  Seniors     │
  │ Ledger  │  │ Transfer   │   │             │  │              │
  └─────────┘  └────────────┘   └─────────────┘  └──────────────┘
```

### 2.3 Composants

- **`zimb.app` (landing)** : présente le service, recrute des seniors, redirige vers `app.zimb.app` ou vers l'installation de l'extension VS Code.
- **`app.zimb.app` (Flutter Web)** : interface Kanban pour les seniors — sélecteur de tickets en post-it, coloré par urgence, swipe & scroll, modal de détail au clic.
- **`api.zimb.app` (middleware)** : orchestrateur unique (voir §6).
- **Extension VS Code / Copilot** : agent `@zimb` invoqué dans le chat, qui crée un ticket avec tags (langages), lien GitHub, contexte du problème.
- **`@zimb-bot` (GitHub App)** : bot OAuth GitHub qui invite/révoque les seniors sur les dépôts privés liés à chaque ticket.
- **Airtable** : source de vérité (tickets, seniors, ledger financier, métadonnées clients).
- **Stripe Connect** : comptes Express pour les seniors, pré-authorisation au moment de la création du ticket, capture + transfer à la validation.

---

## 3. Expérience Utilisateur (UI/UX)

### 3.1 Landing page — `zimb.app`

- **Hero** : pitch en 1 phrase (« Débogue ton vibe code en 45 minutes »).
- **Comment ça marche** : 3 étapes illustrées (Décris → Match → Payé).
- **Bande de seniors** : formulaire de candidature (GitHub, langages, tarif).
- **Footer** : liens documentation, statut, contact.

### 3.2 App Flutter Web — `app.zimb.app` (seniors)

**Vues principales :**

1. **Kanban des tickets** (vue principale)
   - Tickets affichés en **post-it** colorés par urgence :
     - 🟢 Basse — `#10B981`
     - 🟡 Moyenne — `#F59E0B`
     - 🔴 Haute — `#EF4444`
     - 🟣 Critique — `#8B5CF6`
   - **Swipe horizontal** pour filtrer (langage, bounty min, urgence).
   - **Scroll vertical** infini.
   - **Tap** → ouvre la modale de détail.

2. **Modale de détail d'un ticket**
   - Titre, description, bounty, deadline, langages, dépôt GitHub lié.
   - Bouton **« Claim »** (devient invisible aux autres dès le clic — voir §4.2).
   - Une fois claim : compte à rebours visible (timer 45 min).

3. **Vue « Mes tickets »**
   - Liste des tickets que le senior a claim.
   - Statut : *In progress*, *Delivered*, *Validated*, *Disputed*.

### 3.3 Extension VS Code / Copilot

- **Commande** : `@zimb -u corrige moi l'erreur CORS systématique sur api.zimb.app`
- **Action** : l'extension lit le contexte (workspace, fichiers ouverts), détecte les langages utilisés, ouvre un formulaire latéral pré-rempli :
  - Titre + description (éditable)
  - Langages détectés (tags)
  - Lien du dépôt GitHub
  - Bounty proposé (slider)
- **Submit** → appel `POST /tickets` sur `api.zimb.app`.

### 3.4 Couleurs par urgence — référence

| Niveau | Couleur | Hex | SLA cible |
|---|---|---|---|
| Basse | Vert | `#10B981` | 24 h |
| Moyenne | Jaune | `#F59E0B` | 4 h |
| Haute | Rouge | `#EF4444` | 1 h |
| Critique | Violet | `#8B5CF6` | 30 min |

---

## 4. Flux Métier & Sécurité

### 4.0 Canal Web — Formulaire public sur `zimb.app`

En complément de l'extension VS Code / Copilot, le **formulaire de création de ticket est accessible directement sur la landing `zimb.app`**, sans installation requise. C'est le canal d'entrée principal pour les Vibe Coders qui ne sont pas (encore) équipés de l'extension.

**Parcours utilisateur :**

```
[Visitor zimb.app]
       │
       ▼
  CTA "Soumettre un bug"  ──►  /submit
       │
       ▼
  ┌────────────────────────────────────────────────────────┐
  │ Formulaire Web (React/Astro island)                    │
  │                                                        │
  │  - Titre du bug                       [obligatoire]    │
  │  - Description détaillée             [obligatoire]     │
  │  - URL du dépôt GitHub                [obligatoire]     │
  │  - Langages (multi-select)            [obligatoire]     │
  │  - Bounty (slider 10–500 €)           [obligatoire]     │
  │  - Urgence (low/med/high/critical)    [obligatoire]    │
  │  - Email de contact                   [obligatoire]     │
  │                                                        │
  │  [ Soumettre (paiement sécurisé Stripe) ]              │
  └────────────────────────────────────────────────────────┘
       │
       ▼
  api.zimb.app  POST /tickets (canal: "web")
       │
       ├─► Identique au flux extension (§4.1)
       ├─► Email de confirmation envoyé au demandeur
       └─► Lien "Suivre mon ticket" /track/<ticketId>
```

**Avantages du canal web :**

- **Accessibilité** : aucun prérequis technique, recrutement viral possible via partage de lien.
- **Pré-qualification** : un bug bien décrit via formulaire a un taux de résolution supérieur à un ticket rédigé à la hâte dans Copilot.
- **SEO / acquisition** : la page `/submit` est indexable et sert de tunnel de conversion.

**Différenciation des canaux dans Airtable** (table `Tickets`) :

| Champ `channel` | Valeurs | Source |
|---|---|---|
| `vscode` | Extension Copilot | Header `X-Zimb-Client: vscode` |
| `web` | Formulaire landing | Header `X-Zimb-Client: web` |

### 4.1 Création de ticket

```
[Vibe Coder]                                       [Système]
     │                                                   │
     │  1. @zimb "..." ou formulaire web                 │
     ├──────────────────────────────────────────────────►│
     │                                                   │
     │                              2. Middleware :      │
     │                                 - Validation       │
     │                                 - Pre-auth Stripe  │
     │                                 - Création Airtable│
     │                                 - Création repo GH │
     │◄──────────────────────────────────────────────────│
     │                                                   │
     │  3. Ticket visible dans app.zimb.app              │
     │                                                   │
```

**Effets de bord lors de la création :**

1. **Airtable** : nouvelle ligne `Tickets` (status: `open`, bounty, deadline).
2. **Stripe** : `PaymentIntent` en `capture_method: manual` (les fonds sont **bloqués** sur la carte du demandeur, pas encore débités).
3. **GitHub** : `POST /repos` — création du dépôt privé `<org>/zimb-<ticketId>`.
4. **Notification** : push WebSocket vers tous les seniors connectés (`app.zimb.app`).

### 4.2 Système de **Lock & Timer** (45 min)

**Règle fondamentale :** dès qu'un ticket est claim, il devient **invisible** pour les autres seniors et un **timer de 45 minutes** s'enclenche.

```
   Ticket "open"                    Ticket "claimed"
   ┌──────────┐                     ┌──────────────┐
   │ visible  │ ──── senior A ─────►│  invisible   │
   │ pour     │      claim          │  aux autres  │
   │ tous     │                     │  timer: 45:00│
   └──────────┘                     └──────┬───────┘
                                           │
                            ┌──────────────┴───────────────┐
                            │                              │
                       45:00 > 0                      45:00 = 0
                            │                              │
                            ▼                              ▼
                  ┌──────────────────┐          ┌──────────────────┐
                  │ senior travaille │          │ ticket retombe   │
                  │ status: in_prog  │          │ dans le pool     │
                  │ timer décrémente │          │ status: open     │
                  └──────────────────┘          └──────────────────┘
```

#### 4.2.1 Gestion de la concurrence

> **Problème** : deux seniors cliquent sur « Claim » au même moment.

**Solution retenue :** **premier arrivé, premier servi sur le timestamp** (Airtable `created_time` côté `ticket_claims`).

```
┌─────────┐      ┌─────────┐      ┌─────────────────────────────┐
│Senior A │      │Senior B │      │  api.zimb.app (Middleware)   │
└────┬────┘      └────┬────┘      └─────────────┬───────────────┘
     │ click          │ click                  │
     │ 12:00:00.100   │                        │
     ├────────────────┼──────────────────────► │
     │                │ 12:00:00.300          │
     │                ├──────────────────────► │
     │                │                       │ compare timestamps
     │                │                       │ A < B → A gagne
     │◄─── 200 OK ────┤                       │ B → 409 Conflict
     │ ticket claimed │                       │   "already taken"
     │                │◄─── 409 Conflict ─────┤
```

- Implémentation : `POST /tickets/:id/claim` avec `If-Match` sur la version Airtable (`recordId` + `revision`).
- En cas de 409, le client (Flutter Web) rafraîchit immédiatement la vue Kanban.

---

## 7. V2 — Bounty sur le repo du demandeur (sans board centralisé)

### 7.1 Pourquoi ce pivot

Le board centralisé `Zimb/zimb-issues` a été abandonné au profit d'une approche **par-repo** : chaque bounty devient une **Issue sur le repo GitHub du demandeur**, là où vit le code concerné. Cette décision vient de `FOUNDER_NOTES.md` :

> "il y a automatisation github api, vers le depot privé et révocation automatique de l'accès et eventuellement la création d'une branche via @zimb"

### 7.2 Nouveau flow end-to-end

```
[Vibe Coder]                                       [Senior tiers]
     │                                                    │
     │  1. Ouvre VS Code sur son repo GitHub (git clone) │
     │  2. `@zimb /issue mon problème`                   │
     │     (capture auto: langages, remote, sélection)   │
     │                                                    │
     │  3. Extension détecte le remote GitHub du workspace │
     │     → POST /repos/{owner}/{repo}/issues           │
     │        (token user via vscode.authentication)      │
     │                                                    │
     │  4. Issue visible dans le menu GitHub Issues      │
     │     du repo, dans le chat VS Code,                │
     │     et bannière native VS Code en bas à droite     │
     │                                                    │
     │                                                    │
     │  5. Senior voit la bannière, clique "Claim it"    │
     │     → Commentaire `@zimb-bot claim`               │
     │        posté via le **token du senior**            │
     │                                                    │
     │  6. Bot @zimb-bot :                                │
     │     - assign l'issue au senior                    │
     │     - ajoute senior comme collaborator            │
     │       (permission: push)                          │
     │     - crée branche `zimb/T-XXXX`                   │
     │                                                    │
     │  7. Senior push + ouvre PR `zimb/T-XXXX → main`   │
     │     → Bot webhook `pull_request`                  │
     │     → Statut ticket: `delivered`                  │
     │                                                    │
     │  8. Demandeur review + merge                       │
     │     → Quick Win! → paiement via Stripe            │
     │     OU délai 24h → auto-close                      │
```

### 7.3 Permissions minimales du bot @zimb-bot

| Permission | Valeur | Pourquoi |
|---|---|---|
| Repository **Contents** | Read & Write | Créer branches, push commits, merger PR |
| Repository **Pull requests** | Read & Write | Créer la PR du senior |
| Repository **Metadata** | Read-only | Lire infos du repo |
| Organization **Members** | Read & Write | Inviter/révoquer le senior |
| Organization **Administration** | **No access** | Pas besoin — trop permissif |

### 7.4 États de la conversation Zimb (côté VS Code)

| Commande chat | Action |
|---|---|
| `@zimb mon problème` | Ouvre formulaire pré-rempli (V1 web form) |
| `@zimb /submit` | Idem, explicite |
| `@zimb /status T-XXXX` | Lit statut via `api.zimb.app` |
| `@zimb /issue mon problème` | **V2** : publie Issue sur le repo courant |
| `@zimb /issue owner/repo mon problème` | Override du repo cible |

### 7.5 Pourquoi pas de board centralisé ?

- ✅ **Proximité du code** : le bounty est à côté du bug
- ✅ **Permissions naturelles** : le senior push sur le repo du demandeur (qu'il connaît)
- ✅ **Pas de cross-account** : pas besoin de grant access à un repo externe
- ✅ **Notification native** : le demandeur voit le bounty dans SES Issues
- ✅ **Webhooks simplifiés** : un webhook par repo (le bot détecte auto)

### 7.6 Code livré (état au 2026-09-17)

- `packages/extension/src/services/issueCreator.ts` — détecte le remote, crée l'Issue
- `packages/extension/src/commands/issueNotifier.ts` — bannière VS Code
- `packages/extension/src/commands.ts` — commande `zimb.claimIssue(Interactive)`
- `packages/extension/src/chat/participant.ts` — branche `/issue`
- `packages/extension/src/services/repoDetector.ts` — détecte owner/repo depuis `git remote`

### 7.7 Étapes suivantes (M3 → M4)

1. ⏳ Installer `@zimb-bot` sur le repo du demandeur (one-click via UI GitHub)
2. ⏳ Webhook `issues.assigned` → appel `POST /tickets/:id/claim` côté api.zimb.app
3. ⏳ Webhook `pull_request.merged` → `POST /tickets/:id/deliver`
4. ⏳ Stripe Connect escrow pour le paiement

---

*Document maintenu par l'équipe Zimb — Dernière mise à jour : 2026-09-17 (V2)*

#### 4.2.2 Expiration du timer

- **Cron job** côté middleware toutes les **60 s** : scan des `ticket_claims` dont `expires_at < now()`.
- Si expiré :
  1. Status ticket → `open`.
  2. Status claim → `expired`.
  3. **Notification** aux seniors (`ticket back in pool`).
  4. Le demandeur est notifié : « Votre intervenant n'a pas livré à temps, souhaitez-vous un autre senior ? ».

#### 4.2.3 Notification « Match ! » — Le senior a décollé le post-it

Lorsqu'un senior claim avec succès un ticket, **tous les autres seniors connectés** reçoivent immédiatement une notification pour les informer que le post-it a été décollé. C'est un signal social fort qui :
- évite les frustrations (« j'allais claim ! »),
- accélère la prise de décision sur les tickets adjacents,
- crée une émulation positive (FOMO → vélocité).

**Implémentation :**

```
   Senior A claim ticket #42 (succès)
            │
            ▼
   api.zimb.app POST /tickets/42/claim
            │
            ├─► Airtable : claim record créé
            ├─► GitHub : invitation senior A
            │
            └─► WebSocket broadcast (canal: "kanban")
                    │
                    ├─► Senior A : { type: "CLAIMED_BY_ME",
                    │                  ticketId: 42 }
                    │
                    └─► Tous les autres seniors connectés :
                         { type: "TICKET_GONE",
                           ticketId: 42,
                           claimedBy: "@alice_dev",     ← login GitHub
                           bounty: 50,
                           languages: ["ts", "python"],
                           urgency: "high" }
```

**Côté UI Flutter (`app.zimb.app`) :**

| Évènement | Effet visuel |
|---|---|
| `TICKET_GONE` | Le post-it **glisse hors de la grille** (animation slide-out 300 ms), toast : *« 🎯 @alice_dev a décollé le ticket #42 (50 €) »* |
| `CLAIMED_BY_ME` | Le post-it **passe en mode « Mes tickets »**, timer 45:00 visible en gros, pulsation rouge sur le compteur |
| Notification sonore (optionnelle) | « swoosh » discret au claim d'un autre, son « claim ! » personnalisé pour soi-même |

**Persistance & offline :**

- Si un senior est **hors-ligne** au moment du broadcast, il reçoit l'évènement à la reconnexion via un `GET /tickets?since=<lastSeenAt>` qui renvoie la liste des claims récents.
- Le middleware garde un buffer **30 minutes** des évènements kanban dans Redis/KV pour les reconnexions tardives.

**Métriques associées :**

- `time_to_claim` : durée entre `ticket.created_at` et `claim.created_at` (suivi du temps de réaction moyen des seniors).
- `first_claimer_win_rate` : % de tickets où le premier claimer livre effectivement (qualité de la décision de claim).

> **Note anti-spam :** les notifications sont **désactivables** par filtre (ex : *« ne notifier que si bounty > 30 € ou urgence ≥ high »*). Réglage dans les préférences seniors.

### 4.3 Gestion des accès GitHub via `@zimb-bot`

**Rôle de `@zimb-bot`** : GitHub App installée sur l'organisation Zimb, avec permissions :
- `repo` (lecture + écriture sur les repos `zimb-*`)
- `members` (invitation + révocation)

#### 4.3.1 Invitation automatique au claim

```
[Senior claim ticket #42]
          │
          ▼
   api.zimb.app reçoit POST /tickets/:id/claim
          │
          ├─► Airtable : write claim record (status: active, expires_at)
          │
          ├─► GitHub API (via @zimb-bot) :
          │       PUT /repos/{org}/zimb-42/collaborators/{senior_gh_login}
          │       permission: "push"
          │
          └─► Retour 200 au senior
                  → repo dispo immédiatement
```

**Effet pour le senior :** un email GitHub arrive : *« You've been added to zimb-42 »*. Il peut cloner, créer une branche, pousser du code.

#### 4.3.2 Révocation automatique à la clôture

**Déclencheurs de clôture d'un ticket :**

| Évènement | Status final | Révocation GH ? |
|---|---|---|
| Senior livre → client valide « Quick Win ! » | `validated` | ✅ Oui |
| Senior livre → 24 h sans réponse du client | `auto_validated` | ✅ Oui |
| Senior abandonne / expire | `expired` | ✅ Oui |
| Litige ouvert | `disputed` | ⏸️ Suspendu jusqu'au verdict |
| Litige clos → senior gagne | `validated` | ✅ Oui |
| Litige clos → senior perd | `refunded` | ✅ Oui |

```
   Ticket clos
        │
        ▼
   Middleware déclenche :
        │
        ├─► DELETE /repos/{org}/zimb-42/collaborators/{senior_gh_login}
        │
        ├─► Archive repo (optionnel, après 30 j)
        │
        └─► Airtable : audit log "access_revoked"
```

> **Sécurité** : le bot est le **seul** à pouvoir gérer les accès. Les seniors n'ont jamais de droits permanents — ils ne sont invités que pour la durée du ticket.

### 4.4 Livraison du senior

- Le senior pousse son code sur une branche `fix/<ticketId>` dans le dépôt `zimb-<ticketId>`.
- Il crée une **Pull Request** ciblée.
- Dans `app.zimb.app`, il clique sur **« Mark as delivered »** → le ticket passe en status `delivered`.
- Le client reçoit une notification (email + webhook Discord optionnel).

---

## 5. Modèle Économique & Litiges

### 5.1 Bounty & pré-authorisation Stripe

**Au moment de la création du ticket :**

```javascript
// Pseudo-code Stripe Connect
const paymentIntent = await stripe.paymentIntents.create({
  amount: bounty * 100,                  // ex: 5000 = 50,00 €
  currency: 'eur',
  capture_method: 'manual',              // ← fonds bloqués, pas débités
  customer: customerId,
  metadata: { ticketId: 'T-42' },
  // Pas de `transfer_data` ici — la destination sera définie
  // au moment de la capture (cf. §5.3)
});
```

➡️ La carte du demandeur est **pré-authorisée** mais **pas débitée**. Si le ticket expire sans résolution, l'autorisation est annulée automatiquement après 7 jours (politique Stripe).

### 5.2 Commission Zimb : 20 %

Sur chaque bounty validé :

```
┌─────────────────────────────────────────────────────────┐
│ Bounty brut (ex : 50,00 €)                              │
│   ├─► Senior      : 80 %  = 40,00 €                     │
│   └─► Zimb (fee)  : 20 %  = 10,00 €                     │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Flux de **Validation & Payout**

Deux déclencheurs possibles pour la capture Stripe + transfert au senior :

#### 5.3.1 Validation manuelle : **« Quick Win ! »**

```
[Client]                        [Système]
   │                                 │
   │  Click "Quick Win !"            │
   ├────────────────────────────────►│
   │                                 │
   │                  ┌──────────────┴──────────────┐
   │                  │ Middleware :                │
   │                  │  1. Capture PaymentIntent   │
   │                  │  2. transfer_data.destination│
   │                  │     = senior_stripe_acct    │
   │                  │  3. application_fee_amount  │
   │                  │     = 20% bounty            │
   │                  │  4. GitHub: revoke senior   │
   │                  │  5. Airtable: status=valid. │
   │                  │  6. Notif senior + client   │
   │                  └──────────────┬──────────────┘
   │◄────────────────────────────────│
   │ "Merci ! Paiement validé."      │
```

#### 5.3.2 Auto-validation après 24 h sans réponse

```
   Senior "Mark as delivered"               Client silencieux
           │                                       │
           ▼                                       ▼
   ┌──────────────────┐                  ┌─────────────────────┐
   │ status: delivered│                  │  Cron toutes les h. │
   │ delivered_at: T  │                  │  tickets delivered  │
   └────────┬─────────┘                  │  il y a > 24 h ?    │
            │                            └─────────┬───────────┘
            └────────────────►────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │ Auto-validate       │
                          │ - Capture Stripe    │
                          │ - Transfer 80 %     │
                          │ - Fee 20 % Zimb     │
                          │ - Revoke GH access  │
                          │ - Notif client      │
                          └─────────────────────┘
```

**Implémentation du cron :**

```typescript
// Cloudflare Worker — cron trigger toutes les heures
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stale = await airtable.list({
      filter: `{status}='delivered' AND {delivered_at} < '${cutoff}'`,
    });
    for (const ticket of stale) {
      await autoValidate(ticket, env);
    }
  }
};
```

### 5.4 Litiges — arbitrage P2P avec *Reviewer*

**Quand un litige est ouvert :**

1. Le client clique sur **« Dispute »** dans les 7 jours suivant la livraison.
2. Un **reviewer** (senior tiers, niveau staff Zimb) est assigné aléatoirement.
3. Le reviewer dispose de **48 h** pour examiner :
   - Le diff GitHub entre la branche de base et `fix/<ticketId>`.
   - La description initiale du ticket.
   - Les échanges (logs de chat Copilot, captures d'écran).

**Trois verdicts possibles :**

| Verdict | Issue financière | Issue GH | Commission |
|---|---|---|---|
| Senior gagnant | Capture → transfer senior (80 %), Zimb (20 %) | Révocation accès | Zimb 20 % |
| Demandeur gagnant | Annulation PaymentIntent, fonds restitués | Révocation accès | Reviewer perçoit 20 % |
| Compromis (50/50) | Capture → split moitié senior / moitié demandeur | Révocation accès | Zimb 5 %, Reviewer 5 % |

```
                    Litige ouvert
                         │
                         ▼
              ┌──────────────────────┐
              │ Assignation reviewer │
              │ (pool staff, aléat.) │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Reviewer examine GH  │
              │ diff + description   │
              │ (48 h max)           │
              └──────────┬───────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
  Senior gagne    Demandeur gagne    Compromis
   80/20           refund            50/50
   Zimb: 20%       Reviewer: 20%     Zimb 5% + Reviewer 5%
```

---

## 6. Middleware & API (api.zimb.app)

### 6.1 Rôle

Le middleware est **l'unique orchestrateur** entre :
- l'extension Copilot (côté client VS Code),
- l'API Airtable (source de vérité),
- l'API GitHub (via `@zimb-bot`),
- Stripe Connect (paiements).

**Implémentation possible** (au choix selon les contraintes ops) :

| Option | Avantages | Inconvénients |
|---|---|---|
| **Make** (ex-Integromat) | No-code, scénarios visuels, rapide à prototyper | Coût par opération, vendor lock-in |
| **n8n** (self-hosted) | Open source, flexible, auto-hébergeable | Maintenance serveur |
| **Cloudflare Worker** | Edge, latence minimale, gratuit jusqu'à 100k req/j | Pas de scheduler natif (utiliser Cron Triggers) |

**Recommandation MVP :** Cloudflare Worker + Cron Triggers pour l'orchestration temps réel, avec scénarios Make pour les workflows non-critiques.

### 6.2 Routes API principales

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/tickets` | Créer un ticket (extension ou web) |
| `GET` | `/tickets` | Liste paginée (filtres : langages, bounty min, urgence) |
| `POST` | `/tickets/:id/claim` | Claim (atomique, gestion concurrence) |
| `POST` | `/tickets/:id/deliver` | Marquer livré par le senior |
| `POST` | `/tickets/:id/validate` | « Quick Win ! » par le client |
| `POST` | `/tickets/:id/dispute` | Ouvrir un litige |
| `GET` | `/me/tickets` | Tickets du senior connecté |
| `GET` | `/webhooks/stripe` | Réception événements Stripe |
| `GET` | `/webhooks/github` | Réception événements GitHub |

### 6.3 Webhooks entrants

- **Stripe** : `payment_intent.succeeded`, `payment_intent.canceled`, `charge.dispute.created`.
- **GitHub** : `pull_request`, `push` (sur branche `fix/<id>`), pour mettre à jour le statut du ticket.

### 6.4 Schéma du middleware

```
                  ┌──────────────────────────────────────────────┐
                  │             api.zimb.app (Worker)            │
                  │                                              │
   Extension ────►│  ┌────────┐    ┌──────────┐    ┌──────────┐  │
   Copilot        │  │ Routes │───►│ Services │───►│ Adapters │  │
                  │  │  REST  │    │ métier   │    │ externes │  │
   Flutter Web ──►│  └────────┘    └──────────┘    └────┬─────┘  │
                  │       ▲             ▲               │        │
                  │       │             │               │        │
                  │   ┌───┴────┐   ┌────┴─────┐   ┌────▼─────┐  │
                  │   │ Auth   │   │ Lock/Tmr │   │ Airtable │  │
                  │   │ (JWT)  │   │ Manager  │   │ GitHub   │  │
                  │   └────────┘   └──────────┘   │ Stripe   │  │
                  │                               └──────────┘  │
                  │   Cron Triggers (1 min / 1 h)               │
                  │   - Expiration timers                       │
                  │   - Auto-validate 24h                        │
                  │   - Nettoyage sessions                      │
                  └──────────────────────────────────────────────┘
```

### 6.5 Exemple de flux complet (claim → deliver → validate)

```
Senior A          app.zimb.app        api.zimb.app       Airtable   Stripe    GitHub
   │                  │                    │                │         │          │
   │ tap "Claim"      │                    │                │         │          │
   ├─────────────────►│                    │                │         │          │
   │                  │ POST /tickets/42/  │                │         │          │
   │                  │ claim              │                │         │          │
   │                  ├───────────────────►│                │         │          │
   │                  │                    │ write claim    │         │          │
   │                  │                    ├───────────────►│         │          │
   │                  │                    │                │         │          │
   │                  │                    │ invite senior  │         │          │
   │                  │                    ├──────────────────────────────►│ invite collab
   │                  │                    │                │         │          │
   │                  │◄── 200 OK ─────────┤                │         │          │
   │◄───── ticket ───►│                    │                │         │          │
   │                  │                    │                │         │          │
   │ ... travail ...  │                    │                │         │          │
   │                  │                    │                │         │          │
   │ tap "Delivered"  │                    │                │         │          │
   ├─────────────────►│                    │                │         │          │
   │                  │ POST /tickets/42/  │                │         │          │
   │                  │ deliver            │                │         │          │
   │                  ├───────────────────►│                │         │          │
   │                  │                    │ status=delivered│        │          │
   │                  │                    ├───────────────►│         │          │
   │                  │                    │                │         │          │
   │                  │                    │ (24h plus tard)│         │          │
   │                  │                    │ auto_validate  │         │          │
   │                  │                    ├─────────────────────►   │          │
   │                  │                    │                │ capture │          │
   │                  │                    │                │ transfer│          │
   │                  │                    │                │ revoke  ├─────────►│
   │                  │                    │ status=valid.  │         │          │
   │                  │                    ├───────────────►│         │          │
```

---

## 7. Roadmap de Développement

### Phase 1 — Fondations & Kanban (MVP)
- [ ] Création du repo monorepo (Turborepo ou Nx)
- [ ] Base Airtable (schéma : `Tickets`, `Users`, `Claims`, `Ledger`)
- [ ] `app.zimb.app` — Flutter Web : vue Kanban + modale détail
- [ ] Authentification seniors (GitHub OAuth)
- [ ] **Lock & Timer 45 min** + gestion concurrence
- [ ] Déploiement Cloudflare Pages

### Phase 2 — Création de tickets & Extension Copilot
- [ ] Extension VS Code / Copilot avec commande `@zimb`
- [ ] Détection automatique des langages (workspace scan)
- [ ] Formulaire latéral pré-rempli (titre, description, dépôt)
- [ ] `POST /tickets` côté middleware
- [ ] Intégration Stripe Connect (pre-auth `manual capture`)

### Phase 3 — GitHub & accès automatiques
- [ ] Création de la GitHub App `@zimb-bot`
- [ ] Création automatique de `zimb-<ticketId>` à la création du ticket
- [ ] **Invitation automatique du senior au claim**
- [ ] **Révocation automatique à la clôture**
- [ ] Webhook GitHub → mise à jour statut ticket

### Phase 4 — Validation & Payout
- [ ] Bouton **« Quick Win ! »** côté client
- [ ] **Cron auto-validate 24 h**
- [ ] Capture + transfer Stripe Connect avec `application_fee_amount`
- [ ] Notifications email (Resend / Postmark)

### Phase 5 — Litiges & Reviewers
- [ ] Système d'arbitrage P2P avec reviewers
- [ ] Interface reviewer (`/review` route)
- [ ] 3 verdicts : senior gagne / client gagne / compromis
- [ ] Dashboard finance (ledger Airtable)

### Phase 6 — Landing & Marketing
- [ ] `zimb.app` — landing Astro/Next.js
- [ ] Page de candidature seniors
- [ ] SEO + analytics (Plausible)
- [ ] Blog & documentation publique

### Phase 7 — Polish & Scale
- [ ] WebSocket pour le Kanban temps réel (remplacer polling)
- [ ] Système de réputation seniors (note moyenne, taux de résolution)
- [ ] Système de badges / niveaux (Junior, Senior, Staff)
- [ ] Multi-langue (EN/FR/ES)
- [ ] App mobile (React Native ou Flutter) pour les seniors

---

## Annexes

### A. Schéma de la base Airtable

**Table `Tickets`**

| Champ | Type | Notes |
|---|---|---|
| `id` | Auto-number | `T-0001` |
| `title` | Single line | |
| `description` | Long text | |
| `bounty` | Currency (EUR) | |
| `urgency` | Single select | `low` / `medium` / `high` / `critical` |
| `languages` | Multi select | |
| `repo_url` | URL | `https://github.com/zimb/zimb-42` |
| `status` | Single select | `open` / `claimed` / `in_progress` / `delivered` / `validated` / `auto_validated` / `disputed` / `refunded` / `expired` |
| `created_at` | DateTime | |
| `delivered_at` | DateTime | nullable |
| `validated_at` | DateTime | nullable |

**Table `Claims`**

| Champ | Type | Notes |
|---|---|---|
| `ticket_id` | Link → Tickets | |
| `senior_id` | Link → Users | |
| `claimed_at` | DateTime | |
| `expires_at` | DateTime | `claimed_at + 45 min` |
| `status` | Single select | `active` / `expired` / `completed` |

**Table `Users`**

| Champ | Type | Notes |
|---|---|---|
| `id` | Auto-number | |
| `gh_login` | Single line | |
| `gh_id` | Number | |
| `email` | Email | |
| `stripe_account_id` | Single line | nullable |
| `role` | Single select | `junior` / `senior` / `reviewer` / `admin` |
| `rating` | Number (1-5) | moyenne glissante |

### B. Variables d'environnement (Cloudflare Worker)

```toml
# wrangler.toml
[vars]
AIRTABLE_API_KEY    = "pat_xxx"
AIRTABLE_BASE_ID    = "appxxx"
GITHUB_APP_ID       = "123456"
GITHUB_PRIVATE_KEY  = "-----BEGIN RSA PRIVATE KEY-----..."
STRIPE_SECRET_KEY   = "sk_live_xxx"
STRIPE_WEBHOOK_SECRET = "whsec_xxx"
JWT_SECRET          = "..."
```

### C. Glossaire

- **Vibe Coder** : développeur junior qui s'appuie fortement sur l'IA générative (Cursor, Copilot, Cline, Windsurf) pour coder, et qui se retrouve bloqué par des bugs que l'IA ne résout pas.
- **Bounty** : prix fixé par le demandeur pour la résolution d'un ticket.
- **Lock & Timer** : mécanisme d'appropriation exclusive d'un ticket par un senior pour 45 minutes.
- **Quick Win !** : validation manuelle instantanée par le client qui déclenche le payout.
- **Reviewer** : senior tiers de niveau staff Zimb qui arbitre les litiges.

---

*Document maintenu par l'équipe Zimb — Dernière mise à jour : 2026-09-16*

---

## 7. V2 � Bounty sur le repo du demandeur (sans board centralis�)

### 7.1 Pourquoi ce pivot

Le board centralis� Zimb/zimb-issues a �t� abandonn� au profit d'une approche **par-repo** : chaque bounty devient une **Issue sur le repo GitHub du demandeur**, l� o� vit le code concern�. Cette d�cision vient de FOUNDER_NOTES.md :

> "il y a automatisation github api, vers le depot priv� et r�vocation automatique de l'acc�s et eventuellement la cr�ation d'une branche via @zimb"

### 7.2 Nouveau flow end-to-end

`
[Vibe Coder]                                       [Senior tiers]
     �                                                    �
     �  1. Ouvre VS Code sur son repo GitHub (git clone) �
     �  2. @zimb /issue mon probl�me                   �
     �     (capture auto: langages, remote, s�lection)   �
     �                                                    �
     �  3. Extension d�tecte le remote GitHub du workspace �
     �     ? POST /repos/{owner}/{repo}/issues           �
     �        (token user via vscode.authentication)      �
     �                                                    �
     �  4. Issue visible dans le menu GitHub Issues      �
     �     du repo, dans le chat VS Code,                �
     �     et banni�re native VS Code en bas � droite     �
     �                                                    �
     �                                                    �
     �  5. Senior voit la banni�re, clique "Claim it"    �
     �     ? Commentaire @zimb-bot claim               �
     �        post� via le **token du senior**            �
     �                                                    �
     �  6. Bot @zimb-bot :                                �
     �     - assign l'issue au senior                    �
     �     - ajoute senior comme collaborator            �
     �       (permission: push)                          �
     �     - cr�e branche zimb/T-XXXX                   �
     �                                                    �
     �  7. Senior push + ouvre PR zimb/T-XXXX ? main   �
     �     ? Bot webhook pull_request                  �
     �     ? Statut ticket: delivered                  �
     �                                                    �
     �  8. Demandeur review + merge                       �
     �     ? Quick Win! ? paiement via Stripe            �
     �     OU d�lai 24h ? auto-close                      �
`

### 7.3 Permissions minimales du bot @zimb-bot

| Permission | Valeur | Pourquoi |
|---|---|---|
| Repository **Contents** | Read & Write | Cr�er branches, push commits, merger PR |
| Repository **Pull requests** | Read & Write | Cr�er la PR du senior |
| Repository **Metadata** | Read-only | Lire infos du repo |
| Organization **Members** | Read & Write | Inviter/r�voquer le senior |
| Organization **Administration** | **No access** | Pas besoin � trop permissif |

### 7.4 �tats de la conversation Zimb (c�t� VS Code)

| Commande chat | Action |
|---|---|
| @zimb mon probl�me | Ouvre formulaire pr�-rempli (V1 web form) |
| @zimb /submit | Idem, explicite |
| @zimb /status T-XXXX | Lit statut via pi.zimb.app |
| @zimb /issue mon probl�me | **V2** : publie Issue sur le repo courant |
| @zimb /issue owner/repo mon probl�me | Override du repo cible |

### 7.5 Pourquoi pas de board centralis� ?

- ? **Proximit� du code** : le bounty est � c�t� du bug
- ? **Permissions naturelles** : le senior push sur le repo du demandeur (qu'il conna�t)
- ? **Pas de cross-account** : pas besoin de grant access � un repo externe
- ? **Notification native** : le demandeur voit le bounty dans SES Issues
- ? **Webhooks simplifi�s** : un webhook par repo (le bot d�tecte auto)

### 7.6 Code livr� (�tat au 2026-09-17)

- packages/extension/src/services/issueCreator.ts � d�tecte le remote, cr�e l'Issue
- packages/extension/src/commands/issueNotifier.ts � banni�re VS Code
- packages/extension/src/commands.ts � commande zimb.claimIssue(Interactive)
- packages/extension/src/chat/participant.ts � branche /issue
- packages/extension/src/services/repoDetector.ts � d�tecte owner/repo depuis git remote

### 7.7 �tapes suivantes (M3 ? M4)

1. ? Installer @zimb-bot sur le repo du demandeur (one-click via UI GitHub)
2. ? Webhook issues.assigned ? appel POST /tickets/:id/claim c�t� api.zimb.app
3. ? Webhook pull_request.merged ? POST /tickets/:id/deliver
4. ? Stripe Connect escrow pour le paiement

---

*Document maintenu par l'�quipe Zimb � Derni�re mise � jour : 2026-09-17 (V2)*