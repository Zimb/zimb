# 06 — Notifications & Realtime

> **Module :** WebSocket (Cloudflare Durable Objects) + Email (Resend) + Discord/Slack webhooks
> **Fonctionnalités couvertes :** M11, S1, S2, S8

---

## Préconditions

- 3 seniors connectés simultanément sur `app.zimb.app` (Alice, Bob, Charlie)
- WebSocket actif sur canal `kanban`
- Email catcher (Mailtrap) actif
- Webhook catcher (requestbin.com ou équivalent) pour Discord/Slack

---

## CT-NOT-01 — Match ! envoyé aux autres seniors au claim

**Sévérité si échec : S2** (déjà marqué)

```gherkin
Scénario CT-NOT-01 — Broadcast Match ! via WebSocket
  Étant donné qu'Alice, Bob et Charlie sont connectés (WebSocket kanban)
  Et que T-400 est visible par les 3 seniors
  Lorsque Alice claim T-400 via POST /tickets/T-400/claim
  Alors sous 1 s :
    - Bob reçoit un event WebSocket : { type: "TICKET_GONE", ticketId: "T-400", claimedBy: "@senior-alice", bounty: 50 }
    - Charlie reçoit le même event
    - Alice reçoit un event différent : { type: "CLAIMED_BY_ME", ticketId: "T-400" }
  Et côté UI Flutter :
    - Le post-it T-400 glisse hors de la grille de Bob (animation 300 ms)
    - Un toast "🎯 @senior-alice a décollé le ticket T-400 (50 €)" s'affiche 4 s
    - Le post-it passe dans "Mes tickets" d'Alice avec timer 45:00 pulsé
```

---

## CT-NOT-02 — Toast non bloquant et auto-dismiss

**Sévérité si échec : S3** — cosmétique, l'utilisateur ferme le toast manuellement.

```gherkin
Scénario CT-NOT-02 — Toast disparaît sans intervention
  Étant donné qu'un toast "🎯 @bob a décollé T-401" est affiché
  Lorsque 4 secondes s'écoulent sans action
  Alors le toast disparaît avec animation fade-out (200 ms)
  Et l'utilisateur n'a pas eu besoin de cliquer
```

---

**Sévérité si échec : S3** — UX, l'utilisateur peut désactiver manuellement.

## CT-NOT-03 — Préférences anti-spam

```gherkin
Scénario CT-NOT-03 — Filtre bounty minimum respecté
  Étant donné qu'Alice a configuré dans ses préférences :
    - bounty_min_notif = 30 €
    - urgency_min_notif = "high"
  Lorsqu'un ticket T-401 (bounty 20 €, low) est claimé par Bob
  Alors Alice ne reçoit PAS de toast (filtré)
  Et T-401 disparaît quand même de son Kanban (logique métier, pas notif)

Scénario CT-NOT-03b — Bounty au-dessus du seuil
  Lorsqu'un ticket T-402 (bounty 50 €, medium) est claimé
  Alors Alice reçoit bien le toast (car 50 € ≥ 30 €)
```

---

**Sévérité si échec : S2** — UX majeure mais le Kanban se rafraîchit manuellement.

## CT-NOT-04 — Reconnexion après offline

```gherkin
Scénario CT-NOT-04 — Buffer offline rattrapant les events manqués
  Étant donné qu'Alice était déconnectée de 10:00 à 10:30
  Et que pendant cette période, 5 tickets ont été claimés par d'autres seniors
  Lorsque Alice se reconnecte à 10:30
  Alors le middleware lui envoie GET /tickets?since=10:00
  Et le Kanban se rafraîchit avec les 5 tickets manquants déjà retirés
  Et Alice ne reçoit PAS 5 toasts rétroactifs (pas de bruit)
  Et un seul toast "5 tickets ont été claimés pendant votre absence" s'affiche
```

**Sévérité si échec : S2** — UX majeure, le client peut retrouver son ticket via /track.

---

## CT-NOT-05 — Email de confirmation de création

```gherkin
Scénario CT-NOT-05 — Email immédiat après création de ticket
  Étant donné que client1 crée un ticket T-500 via zimb.app/submit
  Lorsque le middleware traite la requête
  Alors sous 30 s, un email arrive dans Mailtrap (client1@zimb-test.app) :
    - Subject: "✅ Ticket T-500 créé sur Zimb"
    - Body contient : ID, titre, bounty, urgence, lien /track/T-500
    - Expéditeur: noreply@zimb.app (DKIM/SPF configurés)
```

---

## CT-NOT-06 — Webhook Discord/Slack optionnel

```gherkin
Scénario CT-NOT-06 — Webhook Discord reçu par le client
  Étant donné que client1 a configuré un webhook Discord dans son profil :
    "https://discord.com/api/webhooks/..."
  Et que senior-alice livre T-500 (status delivered)
  Lorsque le middleware émet la notification
  Alors le webhook Discord reçoit un POST avec payload :
    { content: "✅ Votre ticket T-500 a été livré par @senior-alice. Validez : https://zimb.app/track/T-500" }
  Et sous 5 s, le message apparaît dans le canal Discord du client
```

---

## CT-NOT-07 — Webhook senior informé d'un litige sur son ticket

**Sévérité si échec : S2** — Le senior doit pouvoir préparer sa défense rapidement.

```gherkin
Scénario CT-NOT-07 — Senior notifié Discord/Slack quand un client ouvre un litige
  Étant donné que senior-alice a livré T-500 (status delivered) il y a 6 heures
  Et que senior-alice a configuré un webhook Discord dans son profil senior :
    "https://discord.com/api/webhooks/senior/..."
  Et que client1 clique sur "Ouvrir un litige" sur /track/T-500
  Et que le motif saisi est "Le bug CORS n'est pas résolu" (≥ 20 caractères)
  Lorsque le middleware traite le POST /tickets/T-500/dispute
  Alors le webhook Discord du senior reçoit un POST avec payload :
    {
      content: "⚠️ Litige ouvert sur T-500 par @client1. Préparez votre défense : https://app.zimb.app/tickets/T-500 — SLA reviewer : 48 h",
      embeds: [{
        title: "Détails du litige",
        fields: [
          { name: "Ticket", value: "T-500" },
          { name: "Bounty", value: "50 €" },
          { name: "Motif client", value: "Le bug CORS n'est pas résolu" },
          { name: "Branche GH", value: "fix/T-500" },
          { name: "Diff", value: "+142 / -23 lignes" }
        ]
      }]
    }
  Et un email "⚠️ Litige sur T-500" est envoyé à senior-alice sous 30 s
  Et le webhook contient un lien direct vers le ticket dans app.zimb.app
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-NOT-01 | Match ! broadcast | S2 | ⏸️ |
| CT-NOT-02 | Toast auto-dismiss | S3 | ⏸️ |
| CT-NOT-03 | Préférences anti-spam | S3 | ⏸️ |
| CT-NOT-04 | Reconnexion offline | S2 | ⏸️ |
| CT-NOT-05 | Email création | S2 | ⏸️ |
| CT-NOT-06 | Webhook Discord (client) | S3 | ⏸️ |
| CT-NOT-07 | Webhook Discord (senior litige) | S2 | ⏸️ |
