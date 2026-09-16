# 05 — Litiges & SLA 48h

> **Module :** Litiges P2P + Reviewer interface + Escalation auto
> **Fonctionnalités couvertes :** M12, M13

---

## Préconditions

- Reviewer staff authentifié : `reviewer-staff` avec rôle `role: reviewer`
- 1 ticket livré (T-300) par senior-alice
- Client1 a accès à `/track/T-300`
- Horloge serveur NTP synchronisée

---

## CT-DSP-01 — Ouverture de litige dans la fenêtre 7 jours

```gherkin
Scénario CT-DSP-01 — Client ouvre un litige dans les 7 jours
  Étant donné que T-300 a été marqué delivered il y a 12 heures
  Lorsque client1 clique sur "Ouvrir un litige" sur /track/T-300
  Et qu'il saisit un motif "Le bug CORS n'est pas résolu" (min 20 caractères)
  Alors le ticket passe en status "disputed"
  Et un reviewer est assigné aléatoirement (reviewer-staff ici)
  Et `dispute_opened_at` = maintenant
  Et `sla_dispute_deadline` = dispute_opened_at + 48 heures
  Et un email "Vous avez 48 h pour statuer" est envoyé à reviewer-staff
```

---

## CT-DSP-02 — Litige hors fenêtre 7 jours refusé

**Sévérité si échec : S2** — protection contre dispute hors fenêtre, contournement inutile.

```gherkin
Scénario CT-DSP-02 — Impossible d'ouvrir un litige après J+7
  Étant donné que T-300 a été marqué delivered il y a 8 jours
  Et que le PaymentIntent est expiré (annulé par Stripe)
  Lorsque client1 essaie de cliquer "Ouvrir un litige"
  Alors le bouton est grisé avec tooltip "Délai de litige dépassé (7 jours)"
  Et aucune requête n'est envoyée
```

---

## CT-SLA-01 — Alerte jaune à T+24h

**Sévérité si échec : S1**

```gherkin
Scénario CT-SLA-01 — Escalation jaune 24h avant le SLA
  Étant donné qu'un litige est ouvert sur T-300 depuis 24 h
  Et que reviewer-staff n'a toujours pas statué
  Lorsque le cron de 30 min s'exécute
  Alors :
    - Un email "⚠️ Rappel SLA — T-300 expire dans 24 h" est envoyé à reviewer-staff
    - Un push notification WebSocket "Litige T-300 en attente" est envoyé à reviewer-staff
    - Un message est posté sur le canal Slack interne #staff-zimb
    - Si le reviewer est inactif > 12 h après l'alerte jaune,
      un reviewer #2 (backup) est assigné automatiquement
```

---

## CT-SLA-02 — Alerte rouge à T+42h

```gherkin
Scénario CT-SLA-02 — Escalation rouge 6h avant le SLA
  Étant donné que T-300 est en litige depuis 42 h sans verdict
  Lorsque le cron s'exécute
  Alors :
    - SMS envoyé aux 3 fondateurs : "🚨 SLA breach imminent sur T-300"
    - Page on-call Zimb déclenchée
    - Bouton "Force review" visible pour les admins Zimb
    - Si un admin clique Force Review, il peut statuer directement
```

---

## CT-SLA-03 — SLA breach à T+48h → décision par défaut

**Sévérité si échec : S1**

```gherkin
Scénario CT-SLA-03 — Décision par défaut appliquée au breach
  Étant donné que T-300 est en litige depuis 48 h sans intervention
  Et que le diff GH contient 142 lignes ajoutées / 23 supprimées (substantiel)
  Lorsque le cron de 30 min dépasse T+48h
  Alors la décision par défaut est appliquée : "senior gagne"
  Et Airtable `Tickets.status` = "validated" (avec note `auto_resolved_by_sla_breach`)
  Et le payout standard est exécuté (80 % senior, 20 % Zimb)
  Et un incident `SLA_Breach` est loggué dans Airtable
  Et le reviewer-staff reçoit un email "SLA breach — décision par défaut appliquée"
```

---

## CT-SLA-04 — SLA breach avec diff vide → client gagne

```gherkin
Scénario CT-SLA-04 — Diff vide = client gagne par défaut
  Étant donné que T-300 est en litige depuis 48 h sans intervention
  Et que le diff GH est vide (0 lignes ajoutées / 0 supprimées)
  Lorsque le SLA est dépassé
  Alors la décision par défaut est appliquée : "client gagne"
  Et le PaymentIntent est annulé (fonds restitués à client1)
  Et `Tickets.status` = "refunded"
  Et un incident SLA_Breach est loggué
  Et senior-alice est notifié "Aucun travail livré, ticket remboursé"
```

---

## CT-RVW-01 — Reviewer tranche : senior gagne

```gherkin
Scénario CT-RVW-01 — Verdict "senior gagne"
  Étant donné que reviewer-staff est sur /review/T-300
  Et qu'il a accès au diff GH et à la description initiale
  Lorsqu'il clique sur "Senior a raison" + motif "Fix correct, bug reproduit et résolu"
  Alors le ticket passe en status "validated"
  Et le payout est exécuté normalement (80/20)
  Et l'accès GH de senior-alice est révoqué
  Et les 2 parties sont notifiées par email
```

---

## CT-RVW-02 — Reviewer tranche : client gagne

```gherkin
Scénario CT-RVW-02 — Verdict "client gagne"
  Étant donné que reviewer-staff est sur /review/T-300
  Lorsqu'il clique sur "Client a raison" + motif "Fix ne compile pas"
  Alors le ticket passe en status "refunded"
  Et le PaymentIntent est annulé (fonds restitués à client1)
  Et le reviewer perçoit 20 % du bounty en compensation (transféré depuis compte Zimb)
  Et l'accès GH de senior-alice est révoqué
  Et senior-alice reçoit un email "Verdict défavorable sur T-300"
```

---

## CT-RVW-03 — Verdict compromis (50/50)

```gherkin
Scénario CT-RVW-03 — Verdict compromis
  Étant donné que reviewer-staff est sur /review/T-300
  Lorsqu'il clique sur "Compromis 50/50" + motif "Fix partiel, deuxième itération nécessaire"
  Alors :
    - Senior reçoit 40 % du bounty (50 % × 80 % = 40 %)
    - Client est remboursé de 40 % du bounty (50 % × 80 % = 40 %)
    - Zimb perçoit 5 % (50 % × 20 % × 50 % = 5 %)
    - Reviewer perçoit 5 % (50 % × 20 % × 50 % = 5 %)
    - Total : 40 + 40 + 5 + 5 = 90 % du bounty original
    - Les 10 % restants sont restitués au client (split incomplet)
  Note : ce cas est documenté dans les règles métier pour traçabilité comptable.
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-DSP-01 | Ouverture litige | S1 | ⏸️ |
| CT-DSP-02 | Litige hors fenêtre | S2 | ⏸️ |
| CT-SLA-01 | Alerte jaune 24h | S1 | ⏸️ |
| CT-SLA-02 | Alerte rouge 42h | S1 | ⏸️ |
| CT-SLA-03 | Breach diff substantiel | S1 | ⏸️ |
| CT-SLA-04 | Breach diff vide | S1 | ⏸️ |
| CT-RVW-01 | Verdict senior gagne | S1 | ⏸️ |
| CT-RVW-02 | Verdict client gagne | S1 | ⏸️ |
| CT-RVW-03 | Verdict compromis | S1 | ⏸️ |
