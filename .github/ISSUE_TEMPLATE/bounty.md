---
name: 🎯 Bounty (debugging task)
about: Open a debug bounty for senior devs
title: "[Bounty] "
labels: ["zimb", "bounty", "from-vscode"]
assignees: []
---

## 🐛 The bug

<!-- What's broken? Stack trace, error message, screenshot -->

## 🔬 How to reproduce

```bash
# Minimal reproduction steps
```

## 🎯 Expected behavior

<!-- What should happen instead? -->

## ⚙️ Environment

- Repo: <!-- e.g. Zimb/zimb -->
- Language(s): <!-- e.g. TypeScript 5.6, Node 20 -->
- Commit SHA: <!-- last commit when bug appeared -->

---

## 🤝 How to claim (for contributors)

> 💡 This is a beta open-source project — contributions are voluntary and unpaid at this stage.

Comment `@zimb-bot claim` and I'll:
1. Add you as a collaborator with **push** access on this repo
2. Reply with a 1-command copy-paste for branch + PR

Then:

```bash
# After accepting the invite
gh repo clone <owner>/<repo>
cd <repo>
git checkout -b zimb/#<this-issue-number>-<short-slug>
# ... your fix ...
git add -A && git commit -m "Fix: <one-line summary>"
git push -u origin zimb/#<this-issue-number>-<short-slug>
gh pr create --fill --base main
```

## ✅ Acceptance criteria

- [ ] PR links to this issue (`Fixes #<n>`)
- [ ] Tests added/updated
- [ ] CI green (`npm run lint && npm test && npm run type-check`)
- [ ] Max 7 days between claim and merged PR

## 💸 Recognition

Once the PR is merged, you'll get:
- Full credit on the README contributors list
- A public shoutout on the issue & release notes
- Permanent attribution in git history

No payment or bounty is offered at this stage — this is a beta project.

---

_Powered by [Zimb](https://zimb.app) — bounty debugging for Vibe Coders_
