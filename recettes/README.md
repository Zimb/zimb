# Cahier de Recettes — Zimb.app

> **Document de référence pour les tests d'acceptation (QA) du MVP Zimb.**
> Chaque scénario est un cas de test exécutable, avec critères d'acceptation mesurables.

## Sommaire

| # | Fichier | Parcours couvert | Nb scénarios |
|---|---|---|---|
| 01 | [01-creation-ticket.md](01-creation-ticket.md) | Création de ticket (Web + VS Code) | 10 |
| 02 | [02-kanban-lock-timer.md](02-kanban-lock-timer.md) | Kanban seniors + Lock & Timer 45 min + concurrence | 12 |
| 03 | [03-github-access.md](03-github-access.md) | GitHub App `@zimb-bot` (invite/révocation) | 7 |
| 04 | [04-validation-payout.md](04-validation-payout.md) | Quick Win ! + Auto-validate 24 h + Stripe | 10 |
| 05 | [05-litiges-sla.md](05-litiges-sla.md) | Litiges P2P + SLA 48 h + escalation | 9 |
| 06 | [06-notifications-realtime.md](06-notifications-realtime.md) | Match ! WebSocket + emails + reconnexion offline | 8 |
| 07 | [07-securite-rgpd.md](07-securite-rgpd.md) | Auth, RBAC, RGPD, audit | 8 |
| 08 | [08-template-rapport-bug.md](08-template-rapport-bug.md) | Template de rapport de bug (à utiliser quand un scénario échoue) | — |

**Total : 64 scénarios.**

---

## Convention de notation

Chaque scénario suit le format **Gherkin** (Given / When / Then) :

```gherkin
Scénario [ID] — [Titre court]
  Étant donné que [contexte initial]
  Et que [précondition complémentaire]
  Lorsque [action utilisateur ou système]
  Alors [résultat attendu]
  Et [résultat complémentaire]
```

### Statuts d'exécution

| Symbole | Statut |
|---|---|
| ✅ | Passé |
| ❌ | Échoué (bloquant) |
| ⚠️ | Passé avec réserve (à corriger plus tard) |
| ⏸️ | Non exécuté / bloqué |

### Sévérités

| Niveau | Définition | Action |
|---|---|---|
| **S1 Critique** | Bloque le lancement (fonds perdus, sécurité) | Fix immédiat, redéploiement |
| **S2 Majeure** | Fonctionnalité dégradée mais contournable | Fix sous 48 h |
| **S3 Mineure** | Cosmétique ou UX | Backlog V1.1 |

---

## Critères globaux de recette MVP

Le MVP est **livrable** lorsque :

- [ ] **100 %** des scénarios S1 sont passés
- [ ] **≥ 95 %** des scénarios S2 sont passés
- [ ] Aucun scénario « fonds perdus » n'est en statut ❌
- [ ] Tous les scénarios SLA 48 h sont passés en condition nominale
- [ ] Audit sécurité externe (si réalisé) ne remonte aucune S1

---

## Jeux de données de test

Identifiants à utiliser dans Airtable Sandbox + Stripe Test Mode :

| Rôle | Email | GitHub login (test) | Stripe acct |
|---|---|---|---|
| Client #1 | `client1@zimb-test.app` | `vibe-coder-test` | n/a |
| Client #2 | `client2@zimb-test.app` | `vibe-coder-2` | n/a |
| Senior A | `senior-a@zimb-test.app` | `senior-alice` | `acct_test_alice` |
| Senior B | `senior-b@zimb-test.app` | `senior-bob` | `acct_test_bob` |
| Reviewer | `reviewer@zimb-test.app` | `reviewer-staff` | `acct_test_reviewer` |

**Comptes GitHub :** Organisation `zimb-test-org` avec repos pré-existants pour les tests d'invitation/révocation.

**Cartes Stripe test :**
- Succès : `4242 4242 4242 4242`
- 3D Secure : `4000 0027 6000 3184`
- Refusée : `4000 0000 0000 0002`

---

## Procédure d'exécution recommandée

1. **Tests unitaires** (développeur) → ✅ avant recette
2. **Tests d'intégration** (CI sur chaque PR) → ✅ avant recette
3. **Recette fonctionnelle** (QA / Product Owner) → ce document
4. **Recette UAT** (10 seniors + 20 clients bêta) → 2 semaines avant launch
5. **Recette sécurité** (audit externe optionnel) → avant launch public

Pour chaque scénario :
1. Préparer l'état initial (Airtable + Stripe Dashboard + GitHub org).
2. Exécuter les actions décrites.
3. Vérifier **tous** les « Alors » (sortie console, base, UI).
4. Renseigner le statut (`✅`/`❌`/`⚠️`) + sévérité si échec.
5. Joindre captures d'écran dans le ticket de bug éventuel.

---

*Document maintenu par l'équipe QA Zimb — 2026-09-16*
