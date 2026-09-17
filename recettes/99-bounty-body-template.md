# 📋 Bounty Body — template standard pour nouvelles issues

Ce fichier est la **référence** du body que ton extension VS Code / Worker doit injecter lors de la création d'une bounty issue (via `@zimb /issue` ou l'API).

## Pourquoi

Un senior qui ouvre une bounty issue doit savoir **en 10 secondes** :
- Combien il peut gagner
- Comment claim
- Comment push une PR
- Comment être payé

Si l'une de ces 4 réponses manque, il passe au bounty suivant.

## Body template (Markdown)

````markdown
## 🐛 The bug

<chatPrompt — description extraite du chat @zimb>

## 🔬 How to reproduce

```bash
<si detected: snippet de code de la sélection VS Code>
```

## 🎯 Expected behavior

<!-- À remplir par le demandeur si besoin -->

## 💰 Bounty

**Bounty:** <amount>€ — paid via Stripe after PR merge.

## ⚙️ Environment

- Repo: <owner>/<repo>
- Languages detected: <TS 72%, Dart 7%, ...>
- Last commit: <SHA>

---

## 🚀 How to claim (for seniors)

Comment `@zimb-bot claim` on this issue and I'll add you as a collaborator with **push** access.

```bash
gh repo clone <owner>/<repo>
cd <repo>
git checkout -b zimb/#<N>-<slug>
# ... your fix ...
git add -A && git commit -m "Fix: <summary>"
git push -u origin zimb/#<N>-<slug>
gh pr create --fill --base main
```

## ✅ Acceptance criteria

- PR links this issue (`Fixes #<N>`)
- Tests pass + lint clean + type-check clean
- Delivered within 7 days

## 💸 Payment

Stripe Connect payout within 24h of merge.
Onboard at https://app.zimb.app first.

---

_Powered by [Zimb](https://zimb.app)_
````

## Labels à appliquer

```json
["zimb", "bounty", "from-vscode"]
```

(Voir [SPECIFICATIONS.md §3.3](../SPECIFICATIONS.md) pour le détail.)

## Checklist d'application

- [x] `.github/PULL_REQUEST_TEMPLATE.md` créé
- [x] `.github/ISSUE_TEMPLATE/bounty.md` créé (utilisé si l'user ouvre une issue via l'UI GitHub manuellement)
- [x] Body template de référence documenté ici
- [ ] **TODO** : injecter ce body dans `issueCreator.buildPayload()` côté extension
- [ ] **TODO** : ajouter lien vers ce template dans le message de réponse `@zimb /issue`
- [ ] **TODO** : modifier le body de l'issue #1 existante avec ce format
