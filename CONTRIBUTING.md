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

## 🤖 Install the @zimb-bot GitHub App

**Prerequisites:**
- A GitHub account
- Organization Owner or GitHub App Manager role (for organization-level installation)
- Admin or write rights on target repositories
- For app creators: "Where can this GitHub App be installed?" must be set to "Any account" (or app ownership transferred to the organization)

### Steps

1. Go to https://github.com/apps/zimb-bot (or via developer settings at https://github.com/settings/apps/<app-slug>/installations)
2. Click **Install** (green button, top right)
3. Choose the target organization or user account (e.g. `Zimb` or `zimb-app`)
4. Select repositories:
   - **All repositories** — bot works on every repo
   - **Only select repositories** — recommended (start with just `Zimb/zimb`)
5. Click **Install & Authorize**

### Organization Installation Troubleshooting

If you own the GitHub App and see only an **Edit** button under `Developer settings -> GitHub Apps`, or your organization does not appear in the installation list:
1. Click **Edit** on your app.
2. In the **General** settings tab, change **"Where can this GitHub App be installed?"** to **"Any account"**, then save changes.
3. In the left sidebar, click **Install App**, select your organization, and complete installation.
4. Verify that your GitHub user account has the **Organization Owner** or **GitHub App Manager** role on the target organization.

For detailed configuration instructions and diagnostic checklists, see [docs/GITHUB_APP_ORG_INSTALLATION.md](docs/GITHUB_APP_ORG_INSTALLATION.md).

### Verify it works

1. Open any issue with the `bounty` label on `Zimb/zimb`
2. Go to **Settings → Webhooks** on the repo
3. You should see an active webhook pointing to `https://api.zimb.app/webhooks/github`

---

## 🧪 End-to-end test (5 minutes)

### Step 1 — Clone and build

```bash
gh repo clone Zimb/zimb
cd zimb
npm install
cd packages/extension && npm install && npm run build
code --install-extension zimb-vscode-0.1.0.vsix --force
```

_(Already covered above for extension install — skip if you went through Option A.)_

### Step 2 — Open the project in VS Code

```bash
cd ../..
code .
```

### Step 3 — Sign in to GitHub from the extension

- Click the **Zimb icon** in the activity bar
- Click **Login with GitHub** in the sidebar
- Authorize VS Code to access your GitHub account

### Step 4 — Create a bounty

1. Open **Copilot Chat** (`Ctrl+Shift+I` / `Cmd+Shift+I`)
2. Type: `@zimb /issue My app crashes when I logout twice in a row`
3. Wait for the structured ticket to be generated (LLM-powered via Copilot)
4. Click the banner → opens the new GitHub Issue
5. The issue is created with sections 🎯 Problem / 🔬 Repro / 🎯 Expected vs Actual / 📋 Scope / ✅ Acceptance

### Step 5 — Claim it

Comment on the issue:

```
@zimb-bot claim
```

The bot will:
1. Assign the issue to you
2. Add you as a collaborator with **push** access
3. Reply with a 1-command snippet for branch + PR

### Step 6 — Make a PR

```bash
git checkout -b zimb/#<n>-<slug>
# make your change
git add -A
git commit -m "Fix: ..."
git push -u origin zimb/#<n>-<slug>
gh pr create --fill --base main
```

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
