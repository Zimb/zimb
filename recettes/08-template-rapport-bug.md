# Template — Rapport de Bug Zimb

> **À remplir par le QA / Product Owner quand un scénario du cahier de recettes passe en `❌` (échec) ou `⚠️` (passé avec réserve).**
>
> Un bug = un ticket GitHub (repo `zimb/qa-bugs`) avec exactement ce contenu copié-collé.

---

## Métadonnées

| Champ | Valeur |
|---|---|
| **ID Bug** | `BUG-YYYYMMDD-XXX` (ex: `BUG-20260916-001`) |
| **Date de détection** | YYYY-MM-DD |
| **Détecteur** | Nom du QA / PO |
| **Recette** | Référence du scénario : `CT-XXX-YY` (voir `recettes/*.md`) |
| **Build / Version** | ex: `v0.4.2` ou commit SHA `abc1234` |
| **Environnement** | Sandbox / Staging / Production |
| **Sévérité** | ☐ S1 Critique · ☐ S2 Majeure · ☐ S3 Mineure |
| **Priorité** | ☐ P0 (fix immédiat) · ☐ P1 (fix sous 48h) · ☐ P2 (backlog V1.1) |

---

## Titre court

> Une phrase qui résume le bug (≤ 80 caractères).
> **Exemple :** *"Sur zimb.app/submit, le double-clic sur Soumettre crée 2 tickets en Airtable"*

---

## Description détaillée

> 2–5 phrases expliquant ce qui se passe, dans quel contexte, et l'impact utilisateur / business.

---

## Étapes de reproduction

> Liste numérotée, minimale et déterministe. Le dev doit pouvoir reproduire en suivant ces étapes à l'aveugle.

```
1. Aller sur https://zimb.app/submit
2. Remplir tous les champs (titre, description, dépôt GH, bounty = 50 €)
3. Cliquer deux fois sur "Soumettre" en moins de 200 ms
4. Valider le paiement Stripe (carte 4244)
```

---

## Résultat attendu

> Ce qui devrait se passer selon le scénario de recette ou la spec.

**Exemple :** Un seul ticket `T-XXXX` doit être créé en Airtable, avec un seul PaymentIntent Stripe correspondant.

---

## Résultat observé

> Ce qui se passe réellement. Inclure le message d'erreur exact s'il y en a un.

**Exemple :** Deux tickets sont créés (`T-1001` et `T-1002`), avec deux PaymentIntents Stripe de 50 € chacun. La carte du client est doublement pré-authorisée.

---

## Preuves (à joindre obligatoirement)

- [ ] **Capture d'écran** de l'écran en erreur (annotée si besoin)
- [ ] **Vidéo / GIF** de reproduction (Loom, ou capture écran ≤ 30 s)
- [ ] **Logs console navigateur** (F12 → Console) si applicable
- [ ] **Logs réseau** (F12 → Network, requête fautive) si applicable
- [ ] **Logs Worker Cloudflare** (extrait de la requête fautive, correlation ID)
- [ ] **État Airtable** : capture de la table `Tickets` après le bug
- [ ] **État Stripe Dashboard** : capture des PaymentIntents si concerné
- [ ] **État GitHub** : capture du repo / des collaborateurs si concerné

---

## Environnement technique

| Item | Valeur |
|---|---|
| **Navigateur** | ex: Chrome 128.0.6613.120 / Firefox 130.0 / Safari 17.6 |
| **OS** | ex: macOS 14.6 / Windows 11 / Ubuntu 22.04 |
| **Appareil** | ex: MacBook Pro M2 / Dell XPS 13 / iPhone 15 |
| **Version extension VS Code** | ex: 0.4.2 |
| **Version VS Code** | ex: 1.94.0 |
| **Réseau** | ex: fibre / 4G / VPN d'entreprise |

---

## Impact

| Question | Réponse |
|---|---|
| **Bloque-t-il le lancement MVP ?** | ☐ Oui (S1) · ☐ Non |
| **Bloque-t-il le scénario de recette ?** | ☐ Oui · ☐ Non (contournable) |
| **Y a-t-il un risque financier ?** | ☐ Oui (fonds) · ☐ Oui (données) · ☐ Non |
| **Combien d'utilisateurs sont touchés ?** | ☐ Tous · ☐ Tous les seniors · ☐ Tous les clients · ☐ 1 user spécifique · ☐ Estimation chiffrée : ____ |
| **Y a-t-il un contournement connu ?** | Si oui, décrire : ____ |

---

## Analyse préliminaire (optionnel, à remplir par le dev)

| Champ | Valeur |
|---|---|
| **Hypothèse de cause racine** | ex: *Le bouton Submit ne désactive pas pendant la requête, le client Stripe est appelé 2x* |
| **Composant suspecté** | ex: `app.zimb.app/lib/forms/submit_form.dart` ligne 42 |
| **Correctif suggéré** | ex: *Ajouter un `bool _isSubmitting` + désactiver le bouton entre 2 clics* |
| **Tests à ajouter** | ex: *CT-INT-01-bis — soumettre 3 fois en 100 ms, vérifier 1 seul ticket* |

---

## Catégorisation (à remplir par le tech lead)

| Champ | Valeur |
|---|---|
| **Type** | ☐ Bug fonctionnel · ☐ Bug UI · ☐ Bug perf · ☐ Bug sécurité · ☐ Bug données · ☐ Bug intégration tierce · ☐ Régression |
| **Module** | ☐ Auth · ☐ Kanban · ☐ Middleware · ☐ Paiement · ☐ GitHub · ☐ Litiges · ☐ Notifications · ☐ UI/UX · ☐ Autre : ____ |
| **Sous-système** | ex: `api.zimb.app/routes/tickets.ts` |
| **Tag GitHub** | `bug`, `severity-s1`, `module-payment`, etc. |

---

## Checklist de fermeture

À cocher par le dev qui fixe ET par le QA qui vérifie :

- [ ] **Fix mergé** sur `main` (PR #XXX)
- [ ] **Tests unitaires** ajoutés / mis à jour pour couvrir la régression
- [ ] **Scénario de recette** concerné repasse en `✅` (re-test QA)
- [ ] **Aucun nouveau warning** introduit dans les logs
- [ ] **Pas de régression** sur les scénarios connexes (test de non-régression exécuté)
- [ ] **Déployé** sur staging puis production
- [ ] **Bug clos** dans le tracker (status `done` ou `closed`)
- [ ] **Communication** envoyée aux users impactés si applicable

---

## Historique

| Date | Auteur | Action |
|---|---|---|
| 2026-09-16 | alice@zimb.app | Création du rapport (détection recette CT-INT-01) |
| 2026-09-16 | bob@zimb.app | Assigné à @tech-lead, sévérité confirmée S1 |
| 2026-09-16 | bob@zimb.app | Fix mergé sur main (PR #234) |
| 2026-09-17 | alice@zimb.app | Re-test recette, scénario repasse ✅, bug clos |

---

## Labels GitHub suggérés

```
bug
severity/s1          severity/s2          severity/s3
module/auth          module/kanban        module/middleware
module/payment       module/github        module/dispute
module/notifications module/ui-ux
regression
needs-qa-regression
needs-security-review   (si pertinent)
good-first-issue         (si trivial)
```

---

## Conventions de nommage des titres

Format : `[MODULE] Description courte en français`

**Exemples valides :**
- `[PAIEMENT] Double-clic Soumettre crée 2 tickets en Airtable`
- `[KANKAN] Timer ne se réinitialise pas après expiration`
- `[GITHUB] senior-alice conserve l'accès après auto-validation`
- `[LITIGE] Alerte jaune non envoyée à T+24h`
- `[AUTH] JWT modifié accepté si signature tronquée`

**Exemples invalides :**
- ❌ `Bug truc bizarre` (trop vague)
- ❌ `ça marche pas` (pas de contexte)
- ❌ `[urgent] À REGARDER ABSOLUMENT` (pas de description technique)

---

## Processus de tri (Triage)

**Daily à 10h, par le Product Owner :**

1. **Tri S1** (< 1h) : tous les S1 nouveaux sont assignés immédiatement à un dev, deadline = fin de journée.
2. **Tri S2** (< 48h) : assignés en début de sprint suivant si non urgent.
3. **Backlog S3** : ajoutés au backlog V1.1, revus tous les 15 jours.

**Weekly review :** tous les bugs non fermés sont revus, ceux sans progression > 7 jours sont re-sévérités.

---

## Liens utiles

- [Cahier de recettes complet](../README.md)
- [CDC Zimb](../CDC.md)
- [Spécifications techniques](../SPECIFICATIONS.md)
- Repo QA bugs : `github.com/zimb/qa-bugs`
- Canal Slack : `#qa-zimb`
