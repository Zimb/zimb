# 07 — Sécurité & RGPD

> **Module :** Auth, RBAC, audit, conformité
> **Fonctionnalités couvertes :** sécurité globale, RGPD

---

## Préconditions

- Tous les rôles de test existent en base
- Stripe Test Mode + GitHub test org + Airtable Sandbox
- Outils : curl, navigateur, console devtools

---

## CT-SEC-01 — Auth GitHub OAuth

**Sévérité si échec : S1**

```gherkin
Scénario CT-SEC-01 — Connexion OAuth fonctionnelle
  Étant donné que je suis sur app.zimb.app non authentifié
  Lorsque je clique sur "Se connecter avec GitHub"
  Et que je valide l'écran OAuth GitHub
  Alors je suis redirigé vers app.zimb.app avec un JWT en cookie httpOnly
  Et le JWT contient : { sub: gh_id, role: "senior", exp: now + 7j }
  Et le rôle est bien "senior" (pas "client", pas "reviewer")
  Et la session expire au bout de 7 jours (test : avancer l'horloge)
```

---

## CT-SEC-02 — RBAC strict sur les routes sensibles

**Sévérité si échec : S1**

```gherkin
Scénario CT-SEC-02 — Un client ne peut pas claim un ticket
  Étant donné que je suis authentifié avec role=client (JWT)
  Lorsque j'envoie POST /tickets/T-100/claim
  Alors le middleware renvoie 403 Forbidden
  Et body = { error: "insufficient_role", required: "senior" }
  Et Airtable `Claims` n'est pas modifié

Scénario CT-SEC-02b — Un senior ne peut pas statuer sur un litige
  Étant donné que je suis authentifié avec role=senior
  Lorsque j'envoie POST /tickets/T-100/review avec verdict="senior_wins"
  Alors le middleware renvoie 403 Forbidden
  Et required: "reviewer"

Scénario CT-SEC-02c — Un reviewer peut statuer
  Étant donné que je suis authentifié avec role=reviewer
  Lorsque j'envoie POST /tickets/T-100/review
  Alors le middleware accepte la requête (200 OK)
```

---

## CT-SEC-03 — JWT signature vérifiée

**Sévérité si échec : S1** — contournement auth = accès à tous les comptes.

```gherkin
Scénario CT-SEC-03 — JWT modifié = rejeté
  Étant donné que j'ai un JWT valide avec role=senior
  Lorsque je modifie le payload pour role=admin
  Et que je renvoie une requête avec ce JWT forgé
  Alors le middleware renvoie 401 Unauthorized
  Et la signature invalide est détectée
```

---

## CT-SEC-04 — Pas de secrets en clair dans les réponses API

**Sévérité si échec : S1** — fuite de secrets = compromission totale.

```gherkin
Scénario CT-SEC-04 — Réponse GET /me ne fuite pas de secrets
  Étant donné que je suis authentifié en tant que senior-alice
  Lorsque j'envoie GET /me
  Alors la réponse contient : { id, gh_login, email, role }
  Et NE contient PAS : stripe_secret_key, github_private_key, jwt_secret
  Et le champ `stripe_account_id` est exposé (nécessaire pour les payouts) mais sans le secret
```

---

## CT-SEC-05 — Droit à l'effacement RGPD

**Sévérité si échec : S1**

```gherkin
Scénario CT-SEC-05 — Suppression de compte purge les données
  Étant donné que client1 a 3 tickets en historique
  Et que client1 envoie DELETE /me avec confirmation "SUPPRIMER MON COMPTE"
  Lorsque le middleware traite la requête
  Alors sous 24 h :
    - Airtable `Users.id = client1` est anonymisé (email = "deleted@zimb.app", name = "Deleted User")
    - Les `Tickets.created_by = client1` restent MAIS le champ est remplacé par "deleted_user_<hash>"
    - Le compte Stripe Customer de client1 est supprimé
    - Un email de confirmation "Compte supprimé" est envoyé à l'email original (preuve d'exécution)
  Et après 30 jours, les logs applicatifs ne contiennent plus l'email original
```

---

**Sévérité si échec : S2** — déni de service possible, mais atténué par Cloudflare edge.

## CT-SEC-06 — Rate limiting

```gherkin
Scénario CT-SEC-06 — Limite de requêtes par IP
  Étant donné que je suis sur zimb.app/submit (non authentifié)
  Lorsque j'envoie 101 requêtes POST /tickets en 1 minute depuis la même IP
  Alors les 100 premières passent (ou renvoient 400 si mal formées)
  Et la 101ème renvoie 429 Too Many Requests
  Et un header Retry-After: 60 est présent
  Et après 60 secondes, je peux à nouveau soumettre
```

---

## Récapitulatif

| ID | Titre | Sévérité | Statut |
|---|---|---|---|
| CT-SEC-01 | Auth OAuth | S1 | ⏸️ |
| CT-SEC-02 | RBAC strict | S1 | ⏸️ |
| CT-SEC-03 | JWT signature | S1 | ⏸️ |
| CT-SEC-04 | Pas de secrets en clair | S1 | ⏸️ |
| CT-SEC-05 | Droit à l'effacement | S1 | ⏸️ |
| CT-SEC-06 | Rate limiting | S2 | ⏸️ |

---

## Grille d'audit sécurité (optionnelle, avant launch public)

| Contrôle | Outil | Cible |
|---|---|---|
| Scan dépendances Node.js | `npm audit` + Snyk | 0 vulnérabilité haute |
| Scan dépendances Flutter | `dart pub outdated --mode=security` | Idem |
| Scan secrets commit history | `gitleaks` | 0 secret leak |
| Pentest API | Prestataire externe (optionnel) | 0 S1 trouvée |
| Headers HTTP | `securityheaders.com` | Note A minimum |
| TLS | `ssllabs.com` | A+ |
| CSP | Manuel | `default-src 'self'` strict |
