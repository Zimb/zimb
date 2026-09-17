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
- A GitHub account (free)
- Admin or owner rights on the target repo

### Steps

1. Go to https://github.com/apps/zimb-bot
2. Click **Install** (green button, top right)
3. Choose the org or user account (e.g. `Zimb`)
4. Select repositories:
   - **All repositories** — bot works on every repo
   - **Only select repositories** — recommended (start with just `Zimb/zimb`)
5. Click **Install & Authorize**

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

## 🐛 Troubleshooting

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
