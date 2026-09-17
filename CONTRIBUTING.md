# Contributing to Zimb

First off — thank you for taking the time to contribute! 🎉
Zimb is an open-source **beta** project. Contributions are voluntary and unpaid at this stage. You'll get full README credit and a public shoutout when your PR merges.

> **Status:** beta · **Payment:** none yet · **License:** UNLICENSED (proprietary)

---

## 📋 Table of contents

1. [What is Zimb?](#-what-is-zimb)
2. [Quick start](#-quick-start)
3. [Install the @zimb VS Code extension](#-install-the-zimb-vs-code-extension)
4. [Install the @zimb-bot GitHub App](#-install-the-zimb-bot-github-app)
5. [End-to-end test](#-end-to-end-test-5-minutes)
6. [How to claim an issue](#-how-to-claim-an-issue)
7. [How to make a PR](#-how-to-make-a-pr)
8. [Coding rules](#-coding-rules)
9. [Troubleshooting](#-troubleshooting)
10. [💰 Bounties & payment](#-bounties--payment)
11. [💬 Communication](#-communication)

---

## 💡 What is Zimb?

Zimb is an **open-source debugging platform** that matches Vibe Coders (juniors boosted by AI) with senior devs who can fix AI-induced bugs.

- **Landing:** [zimb.app](https://zimb.app)
- **Kanban (seniors):** [app.zimb.app](https://app.zimb.app)
- **API:** [api.zimb.app](https://api.zimb.app)
- **VS Code extension:** `@zimb` chat participant + sidebar
- **GitHub App:** `@zimb-bot`

---

## 🚀 Quick start

```bash
git clone https://github.com/Zimb/zimb.git
cd zimb
npm install
npx turbo run build
```

**Prerequisites:** Node.js 20+, npm 10+, Git.

---

## 🧩 Install the @zimb VS Code extension

**Prerequisites:** VS Code ≥ 1.94

### Option A — From the `.vsix` file (easiest)

```bash
# Download the latest VSIX:
#   - Tagged releases: https://github.com/Zimb/zimb/releases/tag/v0.1.0
#   - Latest commit:   https://github.com/Zimb/zimb/raw/main/packages/extension/zimb-vscode-0.1.0.vsix

code --install-extension zimb-vscode-0.1.0.vsix --force
```

### Option B — Build from source

```bash
git clone https://github.com/Zimb/zimb.git
cd zimb/packages/extension
npm install
npm run build
code --install-extension zimb-vscode-0.1.0.vsix --force
```

### Verify it works

1. Open VS Code
2. Look at the **left activity bar** → you should see the Zimb icon (a stylised "Z")
3. Click it → a **Bounties** panel opens
4. Open Copilot Chat → type `@zimb` → a list of commands appears

---

## 🤖 `@zimb-bot` GitHub App — NOT WORKING YET

> ⚠️ The `@zimb-bot` GitHub App is **code-complete but not deployed**. The handler lives in `packages/worker/src/services/issueCommentHandler.ts`, but the `api.zimb.app` Cloudflare Worker is not deployed, so **the bot cannot react to comments today**.
>
> This means: even if you install `@zimb-bot` on your repo and comment `@zimb-bot claim` on an issue, **nothing happens automatically**. The claim flow currently has to be done manually:
>
> 1. Comment `@zimb-bot claim` on the issue
> 2. A human (the founder, or anyone watching) reads the comment
> 3. They manually invite you as a collaborator with `push` access
> 4. You branch, push, PR as usual

This will become automatic once `api.zimb.app` is deployed (roadmap item, not done).

---

## 🧪 End-to-end test (5 minutes)

**What this test actually covers today:**

| Step | What it tests | Works? |
|---|---|---|
| 1. Install extension | Sidebar + chat commands appear | ✅ |
| 2. Sign in to GitHub | OAuth flow completes | ✅ |
| 3. `@zimb /redact` | LLM or fallback composes a structured draft | ✅ |
| 4. `@zimb /post` | Issue appears on your GitHub repo with full body | ✅ |
| 5. `@zimb-bot claim` | **Nothing automatic happens** — see above | ❌ |
| 6. PR + merge | Standard GitHub PR flow | ✅ (you do it manually) |

### Step 1 — Install the extension

```bash
code --install-extension https://github.com/Zimb/zimb/releases/download/v0.1.0/zimb-vscode-0.1.0.vsix --force
```

Reload VS Code after.

### Step 2 — Open a folder you own

Any git clone of a GitHub repo where you have push access. **The extension only creates issues on repos it can detect from the workspace's git remote.**

### Step 3 — Sign in to GitHub

When you first use `/post` or `/status`, VS Code pops up a GitHub OAuth dialog. Approve it.

### Step 4 — Compose a bounty

In Copilot Chat:

```
@zimb /redact My app crashes when I logout twice in a row -u high -b 50
```

You should see a preview with a structured title, summary, and sections.

### Step 5 — Publish

```
@zimb /post
```

The extension opens your browser to the new issue (or shows the URL inline). Verify the body has the full sections (🎯 Problem, 🔬 Repro, 🎯 Expected vs Actual, 📋 Scope, ✅ Acceptance).

### Step 6 — Done

That's it. **There is no automatic claim flow, no bot reaction, no payment today.** The senior claiming your bounty has to happen through normal GitHub collaboration (you invite them, they push, they PR).

---

## 🎯 How to claim an issue

1. Browse issues with the `bounty` label: https://github.com/Zimb/zimb/issues?q=label%3Abounty
2. Comment `@zimb-bot claim` on the one you want to take
3. Wait for the bot to add you (you'll receive a GitHub notification)
4. Accept the collaborator invite
5. Branch with convention `zimb/<short-slug>`
6. Open a PR within 7 days

**One claim per person at a time** — finish or release your claim before taking another.

---

## 🛠️ How to make a PR

### Branch naming

```
zimb/#<issue-number>-<short-slug>
# examples:
zimb/#5-fix-typescript-narrowing
zimb/#12-add-stripe-onboarding
```

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): short description
fix(scope): short description
docs(scope): short description
chore(scope): short description
test(scope): short description
```

### Pre-PR checklist

- [ ] Linked to the bounty issue (`Fixes #X`)
- [ ] Tests added or updated
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] No unrelated drive-by changes
- [ ] Branch follows `zimb/<slug>` convention

### Review SLA

Maintainers review within **2 business days**. Be patient, but ping `@Zimb` if no response after 3 days.

---

## 📏 Coding rules

- **TypeScript strict mode** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` are on
- **Format with Prettier** — `npm run format`
- **Lint with ESLint** — `npm run lint`
- **Tests with Vitest** — `npm test`
- **No `any` unless absolutely necessary** — prefer `unknown` + type guards
- **File naming** — `kebab-case.ts` for files, `PascalCase.tsx` for React/Flutter components
- **Comments in English** — codebase is EN-only

See [`SPECIFICATIONS.md`](./SPECIFICATIONS.md) for the full technical reference.

---

## � Bounties & payment

> **TL;DR — there is no automatic bounty payment for unsolicited PRs.**

### How Zimb bounties work (when they exist)

A bounty is **a structured GitHub issue** with:

- The `bounty` label
- A monetary amount in the body front-matter (`bounty: 50 EUR`)
- A pre-authorized payment held in escrow (Stripe `PaymentIntent` with `capture_method: manual`)
- A 7-day expiry

When a senior comments `@zimb-bot claim` on such an issue:

1. The bot creates a private repo `zimb-<ticketId>`
2. Invites the senior with `push` permission
3. Captures the payment only when the PR merges and is approved

### What this means for you

| Scenario | Will you be paid? |
|---|---|
| **You fix a bounty-tagged issue** (label `bounty`) | ✅ **Yes**, after PR merge + capture |
| **You open an unsolicited PR** (no prior bounty, no `bounty` label on the linked issue) | ❌ **No automatic payment** |
| **You add docs / translations / tests unsolicited** | ❌ **No automatic payment**, but you'll be credited in the README contributors list |

### Why this policy?

- The bounty system only works when there's a **pre-authorized payment in escrow** — without that, anyone can claim "you owe me €X" and we'd have no record of agreement.
- Unsolicited contributions are appreciated and will be credited, but they don't trigger payment because no contract was set up.
- This protects both you (no surprise payment demands) and the project (no bounty farming exploits).

### Want to get paid for a fix?

1. **Look for issues labelled `bounty`** — those are the ones with real money behind them.
2. **If you see a bug that deserves a bounty**, open an issue describing it, then ping `@zimb-bot bounty` to request an official bounty (the founder reviews and approves).
3. **Don't put wallet addresses in your PR body or description** — payments go through the formal Stripe escrow flow, not direct transfers.

### Current status

> 🟡 **The bounty payment backend (Stripe Connect) is not yet deployed.** Bounty labels may exist on some issues, but no payment is currently escrowed. Until the backend goes live, **no bounty is enforceable** — merge decisions are at the founder's discretion.

Thanks for understanding 🙏

---

## �🐛 Troubleshooting

| Problem | Fix |
|---|---|
| `code` command not found in terminal | Open VS Code → `Ctrl/Cmd+Shift+P` → "Shell Command: Install 'code' command in PATH" |
| Zimb icon doesn't appear in activity bar | Restart VS Code after install |
| `npm install` fails | Ensure Node 20+: `node --version` (or `nvm use 20`) |
| `@zimb` not recognized in Copilot Chat | Sign in to GitHub Copilot first (status bar bottom-left) |
| Can't push to the repo | Accept the GitHub collaborator invite (check your notifications) |
| Extension sidebar is empty | Check that the current workspace's git remote is a GitHub repo (`git remote -v`) |
| `@zimb-bot claim` doesn't respond | Check Webhooks → Recent Deliveries on the repo. If 401, the bot's secret rotated |
| Build fails on `tsc` | Run `npm run type-check` to see which file is failing |

---

## 💬 Communication

- **Issues & PRs in English** preferred (codebase is EN)
- **Founder replies** can be FR or EN — your call
- **Direct contact:** [@Zimb on GitHub](https://github.com/Zimb)

---

## 📜 License

This project is **UNLICENSED** (proprietary). By contributing, you agree that:
- Your contributions become the property of the Zimb project
- You waive any copyright claim on your contributions
- The maintainers may relicense the project in the future

This is a beta project with the goal of open-sourcing once stable. We'll update this section when that happens.

---

## 🌟 Recognition

Once your PR merges, you'll get:
- Full credit on the **README contributors** section
- A public shoutout on the related issue & release notes
- Permanent attribution in `git log`

Thank you for making Zimb better! 🚀
