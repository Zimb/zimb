# 03 — GitHub Access (via `@zimb-bot`)

> **Module :** GitHub App `@zimb-bot` + Middleware
> **Fonctionnalités couvertes :** M7, M8, S7

---

## Préconditions

- GitHub App `@zimb-bot` installée sur l'org `zimb-test-org`
- Permissions App : `repo` (write), `members` (write)
- Clé privée RSA stockée dans les secrets Cloudflare Worker
- 1 client + 2 seniors de test avec comptes GitHub réels liés

---

## CT-GH-01 — Création du dépôt privé à la création du ticket

**Sévérité si échec : S1**

```gherkin
Scénario CT-GH-01 — Repo privé créé automatiquement
  Étant donné que client1 crée un ticket T-100 via zimb.app/submit
  Lorsque le middleware traite la requête POST /tickets
  Alors l'API GitHub est appelée avec :
    - POST /orgs/zimb-test-org/repos
    - name: "zimb-100"
    - private: true
    - description: "Zimb ticket T-100 — Erreur CORS"
  Et le repo "zimb-test-org/zimb-100" existe dans GitHub sous 5 s
  Et il est privé
  Et Airtable contient la valeur `repo_url` = "https://github.com/zimb-test-org/zimb-100"
```

---

## CT-GH-02 — Invitation automatique au claim

**Sévérité si échec : S1**

```gherkin
Scénario CT-GH-02 — Senior invité au claim
  Étant donné que T-100 est en status "open"
  Et que senior-alice claim T-100 avec succès
  Lorsque le middleware traite le claim
  Alors l'API GitHub est appelée avec :
    - PUT /repos/zimb-test-org/zimb-100/collaborators/senior-alice
    - permission: "push"
  Et senior-alice reçoit un email GitHub "You've been added to zimb-100" sous 30 s
  Et senior-alice peut cloner le repo :
    $ git clone https://github.com/zimb-test-org/zimb-100
  Et le clone réussit (auth OK)
```

---

## CT-GH-03 — Permissions minimales (push only)

```gherkin
Scénario CT-GH-03 — Le senior n'a PAS les droits admin
  Étant donné que senior-alice a été invitée sur zimb-100
  Lorsque je consulte GET /repos/zimb-test-org/zimb-100/collaborators/senior-alice/permission
  Alors la réponse est { permission: "write", role_name: "write" }
  Et NON "admin"
  Et senior-alice NE peut PAS :
    - Supprimer le repo
    - Modifier les settings
    - Inviter d'autres personnes
```

---

## CT-GH-04 — Révocation au « Quick Win ! »

**Sévérité si échec : S1**

```gherkin
Scénario CT-GH-04 — Accès révoqué après validation manuelle
  Étant donné que senior-alice a livré T-100 (status delivered)
  Et que client1 clique sur "Quick Win !"
  Lorsque le middleware traite la validation
  Alors l'API GitHub est appelée avec :
    - DELETE /repos/zimb-test-org/zimb-100/collaborators/senior-alice
  Et sous 30 s :
    - senior-alice reçoit un email GitHub "Your access to zimb-100 was revoked"
    - GET /repos/zimb-test-org/zimb-100/collaborators/senior-alice/permission renvoie 404
  Et un audit log est créé en Airtable : { event: "access_revoked", ticket: T-100, user: senior-alice }
```

---

## CT-GH-05 — Révocation à l'expiration du timer

```gherkin
Scénario CT-GH-05 — Accès révoqué après expiration du claim
  Étant donné que senior-alice a claim T-100 mais n'a pas livré
  Et que 45 min se sont écoulées (claim expiré)
  Lorsque le cron de 60 s s'exécute
  Alors le ticket repasse en "open"
  Et le claim status devient "expired"
  Et l'accès GitHub de senior-alice sur zimb-100 est révoqué (DELETE collab)
  Et senior-alice ne peut plus push sur le repo
```

---

## CT-GH-06 — Révocation à l'auto-validation 24h

```gherkin
Scénario CT-GH-06 — Accès révoqué à l'auto-validation
  Étant donné que senior-alice a livré T-100 à T0
  Et que client1 n'a pas répondu pendant 24 h
  Lorsque le cron horaire s'exécute à T0+24h
  Alors le ticket passe en status "auto_validated"
  Et l'accès GitHub de senior-alice est révoqué
  Et senior-alice reçoit un email "Votre ticket T-100 a été auto-validé"
```

---

## CT-GH-07 — Aucun humain Zimb n'a d'accès permanent

```gherkin
Scénario CT-GH-07 — Audit des collaborateurs permanents
  Étant donné que 50 tickets ont été créés et résolus sur 1 semaine
  Lorsque je liste les collaborateurs de zimb-test-org
  Alors seuls les comptes `@zimb-bot` et les owners de l'org apparaissent
  Et les seniors n'apparaissent JAMAIS comme collaborateurs permanents
  Et les seniors apparaissent uniquement dans les repos `zimb-<ticketId>` (et uniquement pendant la durée du ticket)
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-GH-01 | Création repo privé | S1 | ⏸️ |
| CT-GH-02 | Invitation au claim | S1 | ⏸️ |
| CT-GH-03 | Permissions minimales | S1 | ⏸️ |
| CT-GH-04 | Révocation Quick Win | S1 | ⏸️ |
| CT-GH-05 | Révocation expiration | S1 | ⏸️ |
| CT-GH-06 | Révocation auto-valid | S1 | ⏸️ |
| CT-GH-07 | Pas d'accès permanent | S1 | ⏸️ |
