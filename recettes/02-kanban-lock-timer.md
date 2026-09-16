# 02 — Kanban, Lock & Timer

> **Module :** `app.zimb.app` (Flutter Web seniors) + Middleware
> **Fonctionnalités couvertes :** M4, M5, M11 (partiel), S3, S5

---

## Préconditions

- 2 seniors connectés simultanément : `senior-alice` (Alice), `senior-bob` (Bob)
- 3 tickets "open" pré-créés en Airtable (T-001 low bounty 20€, T-002 high bounty 50€, T-003 critical bounty 100€)
- Horloge serveur synchronisée NTP

---

## CT-KAN-01 — Affichage initial du Kanban

**Sévérité si échec : S2** — UI dégradée mais contournable.

```gherkin
Scénario CT-KAN-01 — Kanban affiche tous les tickets "open" (S2)
  Étant donné que 3 tickets open existent (T-001 low, T-002 high, T-003 critical)
  Et que je suis authentifié comme senior-alice sur app.zimb.app
  Lorsque la page se charge
  Alors je vois 3 post-its à l'écran
  Et T-001 est vert (#10B981)
  Et T-002 est rouge (#EF4444)
  Et T-003 est violet (#8B5CF6)
  Et chaque post-it affiche : titre, langages, bounty, urgence
```

---

## CT-KAN-02 — Filtres Kanban

**Sévérité si échec : S3** — UX, contournable via scroll.

```gherkin
Scénario CT-KAN-02 — Filtrage par urgence
  Étant donné que 3 tickets open existent
  Lorsque je swipe horizontalement sur le filtre "Urgence ≥ High"
  Alors seuls T-002 (high) et T-003 (critical) restent visibles
  Et le compteur "2/3 tickets" s'affiche en haut

Scénario CT-KAN-02b — Filtrage par bounty minimum
  Lorsque je règle le filtre "Bounty min" à 60 €
  Alors seul T-003 (critical, 100 €) reste visible
```

---

## CT-KAN-03 — Modale de détail

**Sévérité si échec : S2** — UX majeure, mais le senior peut claim directement depuis la liste.

```gherkin
Scénario CT-KAN-03 — Clic sur post-it ouvre la modale
  Étant donné que T-002 est visible
  Lorsque je clique dessus
  Alors une modale s'ouvre avec animation slide-up (300 ms)
  Et elle affiche : titre complet, description, dépôt GitHub, langages
  Et un bouton "Claim" bleu est visible en bas
  Et un bouton "Fermer" (croix) est en haut à droite
```

---

## CT-LOCK-01 — Claim réussi rend le ticket invisible aux autres

**Sévérité si échec : S1**

```gherkin
Scénario CT-LOCK-01 — Lock effectif après claim
  Étant donné qu'Alice et Bob sont tous deux connectés sur app.zimb.app
  Et que T-002 est visible par les deux
  Lorsque Alice clique sur "Claim" dans la modale de T-002
  Alors T-002 disparaît du Kanban de Bob en moins de 1 s (via WebSocket)
  Et T-002 apparaît dans la vue "Mes tickets" d'Alice
  Et un timer affiche "44:59" et décompte chaque seconde
  Et Airtable contient 1 ligne dans `Claims` avec status "active"
  Et expires_at = claimed_at + 45 minutes
```

---

## CT-LOCK-02 — Concurrence : premier timestamp gagne

**Sévérité si échec : S1**

```gherkin
Scénario CT-LOCK-02 — Deux seniors claim en même temps
  Étant donné qu'Alice et Bob voient T-002
  Lorsque Alice envoie POST /tickets/T-002/claim à T0 = 100 ms
  Et que Bob envoie POST /tickets/T-002/claim à T0 = 250 ms
  Alors Alice reçoit 200 OK avec le ticket claim
  Et Bob reçoit 409 Conflict avec body { error: "already_taken" }
  Et le Kanban de Bob se rafraîchit et T-002 n'apparaît plus
  Et un toast "🎯 @senior-alice a décollé le ticket T-002 (50 €)" s'affiche pour Bob
```

---

## CT-LOCK-03 — Timer expire, ticket retombe dans le pool

```gherkin
Scénario CT-LOCK-03 — Expiration après 45 minutes
  Étant donné qu'Alice a claim T-002 à 10:00:00
  Et que le timer est à 00:00 (moment T+45 min)
  Lorsque le cron de 60 s s'exécute (à 10:46:00)
  Alors le status du ticket redevient "open"
  Et le status du claim devient "expired"
  Et T-002 réapparaît dans le Kanban de tous les seniors
  Et une notification push "T-002 de retour dans le pool" est envoyée à tous
  Et un email "Votre intervenant n'a pas livré à temps" est envoyé au client
```

---

**Sévérité si échec : S3** — cosmétique, le timer est quand même lisible.

## CT-LOCK-04 — Timer visible et pulsé

```gherkin
Scénario CT-LOCK-04 — Affichage visuel du timer
  Étant donné qu'Alice a claim T-002 il y a 5 minutes
  Lorsque je consulte "Mes tickets"
  Alors le timer affiche "40:00"
  Et il est en gros, centré, couleur blanche sur fond rouge
  Et il pulse (animation scale 1.0 → 1.05 → 1.0 toutes les secondes)
  Et un anneau de progression circulaire se remplit autour
```

---

**Sévérité si échec : S1** — doublons = double payout potentiel.

## CT-LOCK-05 — Anti-replay du claim

```gherkin
Scénario CT-LOCK-05 — Replay d'un claim déjà actif est refusé
  Étant donné qu'Alice a déjà claim T-002 (claim actif)
  Lorsque Alice envoie à nouveau POST /tickets/T-002/claim
  Alors elle reçoit 409 Conflict "already_claimed_by_you"
  Et Airtable ne crée pas de doublon dans `Claims`
```

**Sévérité si échec : S1** — race condition = perte de ticket / double écriture.

---

## CT-LOCK-06 — Pas de race condition sur update Airtable

```gherkin
Scénario CT-LOCK-06 — If-Match protège contre les conflits d'écriture
  Étant donné que T-002 est en revision rev=5 dans Airtable
  Et qu'Alice tente un claim avec If-Match: rev=4 (obsolète)
  Alors la requête est refusée avec 412 Precondition Failed
  Et Alice doit re-fetch le ticket et recommencer
```

**Sévérité si échec : S2** — UX majeure, contournable via Airtable direct.

---

## CT-KAN-04 — Vue « Mes tickets »

```gherkin
Scénario CT-KAN-04 — Liste des tickets claimés par le senior
  Étant donné qu'Alice a 2 tickets actifs (T-002 en cours, T-005 livré)
  Lorsque je navigue vers "Mes tickets"
  Alors je vois 2 lignes :
    | Ticket | Statut      | Timer  |
    | T-002  | in_progress | 38:42  |
    | T-005  | delivered   | —      |
  Et T-005 a un badge "En attente validation client (24h restantes)"
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-KAN-01 | Affichage Kanban | S2 | ⏸️ |
| CT-KAN-02 | Filtres | S3 | ⏸️ |
| CT-KAN-03 | Modale détail | S2 | ⏸️ |
| CT-LOCK-01 | Lock effectif | S1 | ⏸️ |
| CT-LOCK-02 | Concurrence timestamp | S1 | ⏸️ |
| CT-LOCK-03 | Expiration timer | S1 | ⏸️ |
| CT-LOCK-04 | Visuel timer | S3 | ⏸️ |
| CT-LOCK-05 | Anti-replay claim | S1 | ⏸️ |
| CT-LOCK-06 | If-Match Airtable | S1 | ⏸️ |
| CT-KAN-04 | Vue Mes tickets | S2 | ⏸️ |
