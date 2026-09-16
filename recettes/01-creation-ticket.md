# 01 — Création de Ticket

> **Module :** Web (`zimb.app/submit`) + Extension VS Code (`@zimb`)
> **Fonctionnalités couvertes :** M2, M3, partie de M6 (pre-auth Stripe)

---

## Préconditions globales

- Airtable Sandbox avec table `Tickets` vide
- Stripe Test Mode actif
- Email de test accessible (`mailtrap.io` ou équivalent)
- GitHub org `zimb-test-org` configurée avec l'App `@zimb-bot`

---

## CT-WEB-01 — Création réussie via formulaire web

**Sévérité si échec : S1**

```gherkin
Scénario CT-WEB-01 — Vibe Coder crée un ticket via zimb.app/submit
  Étant donné que je suis sur zimb.app/submit non authentifié
  Et que tous les champs sont vides
  Lorsque je remplis :
    | Champ        | Valeur                                  |
    | Titre        | "Erreur CORS sur api.example.com"       |
    | Description  | "GET /users renvoie CORS preflight..."  |
    | URL dépôt    | "https://github.com/test-org/test-repo" |
    | Langages     | ["TypeScript", "Node.js"]               |
    | Bounty       | 50 €                                    |
    | Urgence      | "high"                                  |
    | Email        | "client1@zimb-test.app"                 |
  Et que je clique sur "Soumettre (paiement sécurisé)"
  Et que je valide le paiement Stripe avec la carte 4242 4242 4242 4242
  Alors la page de confirmation s'affiche avec un ID ticket "T-XXXX"
  Et un email de confirmation est envoyé à "client1@zimb-test.app" sous 30 s
  Et Airtable contient 1 nouvelle ligne dans `Tickets` avec status "open"
  Et Stripe Dashboard affiche 1 PaymentIntent status "requires_capture" pour 50,00 €
  Et le dépôt GitHub `zimb-test-org/zimb-XXXX` est créé en privé
  Et le canal WebSocket `kanban` diffuse un event "TICKET_CREATED"
```

---

## CT-WEB-02 — Validation des champs obligatoires

```gherkin
Scénario CT-WEB-02 — Formulaire incomplet bloqué côté client
  Étant donné que je suis sur zimb.app/submit
  Lorsque je clique sur "Soumettre" sans remplir aucun champ
  Alors les 7 champs sont marqués en erreur (bordure rouge + message)
  Et le bouton "Soumettre" est désactivé
  Et aucune requête réseau n'est émise vers api.zimb.app

Scénario CT-WEB-02b — Email invalide bloqué
  Étant donné que tous les champs sont valides sauf email = "not-an-email"
  Lorsque je clique sur "Soumettre"
  Alors le champ email affiche "Format invalide"
  Et le formulaire n'est pas soumis
```

---

## CT-WEB-03 — Bounty hors limites

```gherkin
Scénario CT-WEB-03 — Bounty < 10 € refusé
  Étant donné que tous les champs sont valides
  Lorsque je place le slider bounty à 5 €
  Alors un message "Bounty minimum : 10 €" s'affiche
  Et le bouton "Soumettre" est désactivé

Scénario CT-WEB-03b — Bounty > 500 € redirige
  Étant donné que tous les champs sont valides
  Lorsque je place le slider bounty à 750 €
  Alors un message "Pour les bounties > 500 €, contactez-nous" s'affiche
  Et un lien mailto vers contact@zimb.app est proposé
```

---

## CT-WEB-04 — Canal `web` correctement enregistré

```gherkin
Scénario CT-WEB-04 — Le canal d'origine est tracé en Airtable
  Étant donné que je crée un ticket via zimb.app/submit
  Alors la colonne `channel` du ticket en Airtable vaut "web"
  Et le header de la requête POST /tickets contient "X-Zimb-Client: web"
```

---

## CT-VSC-01 — Création réussie via extension VS Code

**Sévérité si échec : S1** (déjà OK — fonds bloqués)

```gherkin
Scénario CT-VSC-01 — Vibe Coder crée un ticket via @zimb dans Copilot
  Étant donné que l'extension Zimb est installée dans VS Code
  Et que je suis authentifié (GitHub OAuth)
  Et qu'un workspace TS est ouvert avec 3 fichiers .ts
  Lorsque je tape "@zimb corrige l'erreur CORS sur api.example.com" dans le chat Copilot
  Alors le panneau latéral Zimb s'ouvre avec un formulaire pré-rempli :
    | Champ titre         | "Erreur CORS sur api.example.com"             |
    | Langages détectés   | ["TypeScript"]                                |
    | URL dépôt           | "https://github.com/<mon-repo>" (détecté)    |
  Et que je saisis bounty = 40 € et urgence = "medium"
  Et que je clique sur "Soumettre"
  Et que je valide le paiement Stripe (carte 4242)
  Alors le ticket est créé avec channel = "vscode"
  Et une notification toast "Ticket T-XXXX créé !" s'affiche 5 s dans VS Code
```

---

## CT-VSC-02 — Détection automatique des langages

**Sévérité si échec : S3** — cosmétique, langages re-saisissables manuellement.

```gherkin
Scénario CT-VSC-02 — Langages scannés depuis le workspace
  Étant donné que mon workspace contient :
    - 5 fichiers .py
    - 2 fichiers .ts
    - 1 fichier .go
  Lorsque j'ouvre le formulaire Zimb
  Alors le champ "Langages" est pré-coché avec : ["Python", "TypeScript", "Go"]
  Et la répartition (%) est affichée : Python 62 %, TS 25 %, Go 13 %
```

---

**Sévérité si échec : S3** — UX dégradée, le senior/client peut attendre.

## CT-VSC-03 — Mode hors-ligne

```gherlin
Scénario CT-VSC-03 — Soumission impossible sans réseau
  Étant donné que ma connexion internet est coupée
  Lorsque j'ouvre le formulaire Zimb
  Alors le formulaire est en lecture seule
  Et un bandeau "Connexion requise pour soumettre un ticket" est affiché
  Et le bouton "Soumettre" est désactivé
```

---

## CT-INT-01 — Idempotence du POST /tickets

```gherkin
Scénario CT-INT-01 — Double-clic ne crée pas 2 tickets
  Étant donné que je remplis le formulaire web avec bounty = 30 €
  Lorsque je double-clique sur "Soumettre" (2 clics en < 200 ms)
  Alors exactement 1 ticket est créé en Airtable
  Et Stripe affiche exactement 1 PaymentIntent
  Et l'ID client de la requête contient un `Idempotency-Key` unique
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-WEB-01 | Création web OK | S1 | ⏸️ |
| CT-WEB-02 | Validation champs | S2 | ⏸️ |
| CT-WEB-03 | Bounty hors limites | S3 | ⏸️ |
| CT-WEB-04 | Canal web tracé | S2 | ⏸️ |
| CT-VSC-01 | Création VS Code OK | S1 | ⏸️ |
| CT-VSC-02 | Détection langages | S2 | ⏸️ |
| CT-VSC-03 | Hors-ligne | S3 | ⏸️ |
| CT-INT-01 | Idempotence POST | S1 | ⏸️ |
