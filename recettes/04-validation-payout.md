# 04 — Validation & Payout

> **Module :** Paiement (Stripe Connect) + Middleware
> **Fonctionnalités couvertes :** M6, M9, M10

---

## Préconditions

- Stripe Test Mode actif
- 2 seniors avec comptes Connect Express configurés (`acct_test_alice`, `acct_test_bob`)
- 1 client avec carte valide `4242 4242 4242 4242`

---

## CT-PAY-01 — Pré-authorisation à la création

**Sévérité si échec : S1**

```gherkin
Scénario CT-PAY-01 — Fonds bloqués mais pas débités (S1 — fonds)
```
  Étant donné que client1 crée un ticket T-200 avec bounty = 50 €
  Lorsque le middleware crée le PaymentIntent
  Alors Stripe Dashboard affiche :
    - amount: 5000 (centimes)
    - status: "requires_capture"
    - capture_method: "manual"
    - metadata.ticketId: "T-200"
  Et la carte de client1 est PRÉ-AUTHORISÉE mais PAS DÉBITÉE
  Et le solde client1 n'est pas encore mouvementé (consultable via Stripe)

Scénario CT-PAY-01b — Annulation automatique après 7 jours
  Étant donné que T-200 reste "open" (jamais claimé) pendant 7 jours
  Lorsque 7 jours se sont écoulés
  Alors Stripe annule automatiquement le PaymentIntent (status: "canceled")
  Et l'autorisation expire côté banque émettrice
  Et Airtable `Tickets.status` reste "open" (pas de ticket "lost" silencieux)
```

---

## CT-PAY-02 — Quick Win ! capture + transfer

**Sévérité si échec : S1**

```gherkin
Scénario CT-PAY-02 — Validation manuelle déclenche le payout
  Étant donné que T-200 a été claimé par senior-alice et livré (status delivered)
  Et que le PaymentIntent est toujours "requires_capture"
  Lorsque client1 clique sur "Quick Win !" sur la page /track/T-200
  Alors le middleware exécute :
    1. paymentIntents.capture(pi_xxx, { amount_to_capture: 5000 })
    2. transfers.create({ amount: 4000, destination: acct_test_alice })
    3. application_fee_amount = 1000 (20 % Zimb)
  Et le PaymentIntent passe en status "succeeded"
  Et Airtable `Tickets.status` = "validated"
  Et senior-alice reçoit un email "Paiement de 40 € effectué sur votre compte"
  Et client1 reçoit un email "Merci ! 50 € débités pour T-200"
  Et l'accès GH de senior-alice sur zimb-200 est révoqué
```

---

## CT-PAY-03 — Auto-validation à 24h

**Sévérité si échec : S1**

```gherkin
Scénario CT-PAY-03 — Validation automatique après silence client 24h
  Étant donné que T-200 a été marqué delivered par senior-alice à T0
  Et que client1 n'a pas cliqué Quick Win / Dispute pendant 24 h
  Lorsque le cron horaire s'exécute à T0 + 24h
  Alors le middleware déclenche le même flux que CT-PAY-02 (capture + transfer + revoke GH)
  Et Airtable `Tickets.status` = "auto_validated" (≠ "validated")
  Et le champ `auto_validated_at` est rempli avec T0+24h
  Et client1 reçoit un email "Votre ticket T-200 a été validé automatiquement"
  Et senior-alice reçoit son payout (40 €)
```

---

## CT-PAY-04 — Calcul correct de la commission

```gherkin
Scénario CT-PAY-04 — Commission 20 % appliquée correctement
  Étant donné qu'un bounty de 33 € est validé (Quick Win)
  Lorsque la capture Stripe est effectuée
  Alors le transfer vers le senior est de 26,40 € (80 %)
  Et l'application_fee Zimb est de 6,60 € (20 %)
  Et le total débité au client est de 33,00 €
  Et 26,40 + 6,60 = 33,00 ✓ (cohérence comptable)

Scénario CT-PAY-04b — Arrondi sur bounty impair
  Étant donné qu'un bounty de 17 € est validé
  Alors le transfer senior est de 13,60 € (arrondi à 2 décimales)
  Et la commission Zimb est de 3,40 €
  Et total = 17,00 € (jamais de perte de centimes)
```

---

## CT-PAY-05 — Échec de capture (carte expirée)

```gherkin
Scénario CT-PAY-05 — Quick Win ! échoue si carte expirée
  Étant donné que la carte de client1 expire pendant les 45 min du claim
  Et que senior-alice a livré T-200
  Lorsque client1 clique sur "Quick Win !"
  Alors Stripe renvoie une erreur "card_expired"
  Et l'erreur est affichée à client1 : "Votre carte a expiré, merci de la mettre à jour"
  Et le ticket reste en status "delivered"
  Et le client peut mettre à jour sa carte et réessayer
```

---

## CT-PAY-06 — Double Quick Win ! bloqué

```gherkin
Scénario CT-PAY-06 — Idempotence du Quick Win
  Étant donné que client1 clique sur Quick Win ! à T0
  Et que le webhook Stripe confirme le payment_intent.succeeded
  Et que client1 rafraîchit la page et clique à nouveau à T0+5s
  Alors la seconde requête renvoie un message "Ticket déjà validé"
  Et aucun double payout n'est effectué
  Et Stripe ne contient qu'un seul transfert vers senior-alice
```

---

## CT-PAY-07 — Devise unique EUR

```gherkin
Scénario CT-PAY-07 — Pas de multi-devise en V1
  Étant donné qu'un client essaie de soumettre avec un compte Stripe USD
  Lorsque la requête POST /tickets arrive
  Alors le middleware refuse avec 400 Bad Request
  Et le message indique "Devise EUR uniquement supportée en V1"
```

---

## CT-PAY-08 — Payout visible côté senior

```gherkin
Scénario CT-PAY-08 — Dashboard Connect reflète le payout
  Étant donné que senior-alice a reçu un payout de 40 € sur acct_test_alice
  Lorsque je consulte le Stripe Dashboard Express de senior-alice
  Alors la transaction apparaît dans la liste des payouts
  Et le montant net est de 40 € (frais Stripe Connect déduits séparément)
  Et la date de mise à disposition est J+2 ouvrés (standard Stripe)
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-PAY-01 | Pré-auth 7 jours | S1 | ⏸️ |
| CT-PAY-02 | Quick Win payout | S1 | ⏸️ |
| CT-PAY-03 | Auto-validate 24h | S1 | ⏸️ |
| CT-PAY-04 | Commission 20 % | S1 | ⏸️ |
| CT-PAY-05 | Carte expirée | S2 | ⏸️ |
| CT-PAY-06 | Double Quick Win | S1 | ⏸️ |
| CT-PAY-07 | EUR uniquement | S2 | ⏸️ |
| CT-PAY-08 | Payout Connect | S2 | ⏸️ |
