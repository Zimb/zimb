# Zimb Strategy — Pivot to GitHub-native (2026-09-17)

> **TL;DR** — Zimb pivoted from a custom web marketplace to a **GitHub-issues-native platform**. Bounties are GitHub issues labeled `bounty`. Seniors claim via `@zimb-bot claim` comment. This document captures the why, how, and what's next.

---

## 1. The pivot — what changed

### Before (V1 — custom app)

```
Vibe Coder                  Zimb platform                Senior
──────────                  ─────────────                ──────
  │                              │                          │
  ├──► zimb.app/submit ──────────►                          │
  │   (fill form, signup)         │                          │
  │                               ├──► Kanban (app.zimb.app) ┤
  │                               │   (filter open bounties) │
  │                               │                          ├── click claim
  │                               │                          ├── open IDE
  │                               │                          ├── write code
  │                               ◄─────── PR link ─────────┤
  │ ◄────── validation ───────────►                          │
  └── receive fix                Stripe escrow + payout    (gets paid)
```

### After (V2 — GitHub-native)

```
Vibe Coder                GitHub Issues                Senior
──────────                ─────────────                ──────
  │                              │                          │
  ├──► label `bounty` ──────────►                          │
  │   on existing GitHub issue   │                          │
  │                              ├── sees issue in feed ──► │
  │                              │                          ├── comment
  │                              │                          │ @zimb-bot claim
  │                              │                          ├── bot grants push
  │                              │                          │  on private repo
  │                              │                          ├── write code + PR
  │                              ◄────────── PR ───────────┤
  │ ◄──── merge PR ──────────────►                          │
  └── ship fix                 (voluntary contribution,  (gets README credit
                                README credit)             + shoutout)
```

---

## 2. Why the pivot is right

### 2.1 Acquisition costs drop to ~0

| Channel | Where do Vibe Coders live? | Where do Seniors live? | Cost to reach |
|---------|---------------------------|------------------------|---------------|
| V1 (app) | **Nowhere** — must visit zimb.app | **Must download** app.zimb.app | Paid acquisition needed |
| V2 (GitHub) | **Already there** (their repo) | **Already there** (their GitHub feed) | Free — notification only |

**Proof point (Sept 2026)**: First bounty posted → first senior (nazasnow) claimed in <12 hours, **without any marketing**.

### 2.2 No legal/payment friction

| Constraint | V1 (Stripe Connect) | V2 (voluntary) |
|------------|---------------------|-----------------|
| Legal entity | Required (Stripe TOS) | None |
| KYC seniors | Required | None |
| VAT handling | Required (20% commission) | None |
| Refund/dispute flow | Required (M5 SLA escalation) | None |
| Tax declaration | Required | None |

→ V2 = **stay indie without company registration**.

### 2.3 GitHub already has the UX

| Feature | V1 cost | V2 cost |
|---------|---------|---------|
| Issue creation | Build a form | `gh issue create` (native) |
| Bounty browsing | Build Kanban | `is:issue is:open label:bounty` |
| Notifications | Email/push system | GitHub notifications |
| Code review | Build a review system | Native PR reviews |
| Search | Build search UI | Native GitHub search |
| Mobile UX | Build PWA | GitHub mobile app |

### 2.4 The MVP shipped in days, not months

| Component | V1 estimate | V2 actual |
|-----------|-------------|-----------|
| Frontend (Kanban) | 3-6 months Flutter Web | **0** (use GitHub) |
| Landing page | 1 month Astro | **0** (CONTRIBUTING.md) |
| Auth (signup) | 1 month OAuth + sessions | **0** (GitHub OAuth via extension) |
| Stripe Connect onboarding | 2 months | **0** (skipped) |
| Payment flow + disputes | 2-3 months M4/M5 | **0** (skipped) |
| VS Code extension | 1 month | **Done (v0.1.0)** |
| GitHub App `@zimb-bot` | 1 month | **Done (Sept 2026)** |

---

## 3. What's currently shipped (v0.1.0)

| Component | Status | Where |
|-----------|--------|-------|
| `@zimb-bot` GitHub App | ✅ Live | github.com/apps/zimb-bot |
| `@zimb` VS Code extension | ✅ Packaged | `packages/extension/zimb-vscode-0.1.0.vsix` |
| Cloudflare Worker (M1+M2) | ✅ Code ready | `packages/worker/src/` |
| Airtable schema | ✅ Live | Base `app3nJnXwfLeNfT8n` |
| `CONTRIBUTING.md` | ✅ Published | github.com/Zimb/zimb |
| Issue template `bounty.md` | ✅ Published | `.github/ISSUE_TEMPLATE/` |
| PR template | ✅ Published | `.github/PULL_REQUEST_TEMPLATE.md` |
| Bounty body template | ✅ Published | `recettes/99-bounty-body-template.md` |
| Worker deployed to api.zimb.app | ❌ Not deployed | DNS not configured |

---

## 4. How it works end-to-end

### 4.1 Vibe Coder flow (the simplest possible)

```
1. Open any GitHub issue on a repo where @zimb-bot is installed
2. Add the `bounty` label
3. (Optional) Install @zimb VS Code extension → use `@zimb /issue` chat command
   → LLM helps structure the issue (Problem / Repro / Expected / Scope / Acceptance)
4. Wait. That's it.
```

### 4.2 Senior flow (one comment to claim)

```
1. See a bounty-labeled issue (GitHub feed, search, or @zimb extension sidebar)
2. Comment: `@zimb-bot claim`
3. Bot responds with:
   - "You're assigned + added as collaborator with push access"
   - Repo URL: github.com/{owner}/zimb-{ticketId}
   - One-command snippet:
       git clone git@github.com:{owner}/zimb-T-XXXX.git
       cd zimb-T-XXXX
       git checkout -b zimb/#N-slug
4. Push fix + open PR against the original repo
5. Maintainer reviews, merges, done.
```

### 4.3 Backend flow (what `@zimb-bot` does)

```
GitHub webhook (issue_comment event)
  └─► Cloudflare Worker (/webhooks/github)
        ├─► Verify signature (HMAC-SHA256, secret stored as GITHUB_WEBHOOK_SECRET)
        ├─► Parse comment: is it "@zimb-bot claim" from a valid senior?
        ├─► Airtable: create/update claim record (status: active, expires_at: now + 24h)
        ├─► Octokit (GitHub App auth):
        │     ├─► Create private repo `zimb-{ticketId}` if not exists
        │     ├─► Invite the commenter as collaborator with `push` permission
        │     └─► Assign the issue to them
        └─► Reply comment with repo URL + clone instructions
```

---

## 5. What's intentionally NOT shipped

| Item | Why deferred |
|------|-------------|
| Stripe Connect | Beta is voluntary; adding money = legal entity + KYC |
| Litige / dispute flow | No payment = no dispute |
| SLA escalation cron | No payment = no urgency timer for payout |
| Frontend (Flutter Kanban) | GitHub IS the Kanban |
| Landing page | Not needed for V2 — `CONTRIBUTING.md` is the landing |
| User accounts | GitHub OAuth via extension is enough |
| 20% commission | No platform cut in V2 |

---

## 6. Future monetization options (post-beta)

### Option A — Zimb Pro for companies
- Repo sponsors pay $$/month to enable bounties on their org
- Analytics dashboard (which bounties get claimed fastest, average resolution time)
- Priority routing (bounties from paid orgs reach seniors first)
- **Target**: $50-500/month per repo/org

### Option B — Maintainer-as-a-service
- Vibe Coders can hire a Zimb-verified maintainer to triage their issues
- Subscription model ($99/month for unlimited triage + bounty routing)
- **Target**: indie devs + small teams

### Option C — Enterprise on-prem
- Sell Zimb to enterprises that want a self-hosted debug-bounty system
- License model ($5-20k/year)
- **Target**: companies with internal bug bounty programs

### Option D — Marketplace add-on (only when needed)
- Re-introduce Stripe Connect ONLY if a clear user need appears
- e.g., "I want to pay someone $200 to fix this critical bug, not beg for volunteers"
- **When**: when organic usage shows a gap (likely after 100+ bounties/month)

---

## 7. KPIs to watch

| Metric | Target Q1 2027 | Why |
|--------|----------------|-----|
| Bounties posted | 50 | Validates Vibe Coder demand |
| Bounty claim rate | >50% | Validates senior supply |
| Median time-to-claim | <24h | Validates responsiveness |
| PRs merged | 30 | Validates quality |
| Re-bounties by same user | 5 | Validates retention |
| Conversion to Pro (if launched) | 5% | Validates monetization |

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Bounty spam (low-quality issues) | Manual triage for first 30 days; require `bounty` label approval by repo owner |
| Senior griefing (claim without delivering) | Auto-revoke push access after 7 days of inactivity; soft-ban after 3 abandons |
| No quality signal | `verified-by-zimb` badge after first successful merge; maintainer reviews PRs |
| `nazasnow` only contributor | Promote on dev.to / Hacker News / Reddit r/programming when 5 bounties succeed |
| GitHub App rate limits | Cache user lookups in KV; use GraphQL for batched reads |
| Backend Worker not deployed | Local testing OK for beta; deploy when first 10 bounties prove the model |

---

## 9. Decision summary

**We chose V2 (GitHub-native) over V1 (custom marketplace) because:**
1. Vibe Coders + seniors are **already on GitHub** → no acquisition cost
2. First user proof (`nazasnow`) → **model validated**
3. **No legal/fiscal complexity** → stays indie
4. **MVP shipped in days**, not months
5. GitHub IS the marketplace UX → **less code, more value**

**We deferred:**
- Stripe Connect (defer until real user need)
- Flutter Kanban frontend (defer indefinitely)
- Landing page (defer; CONTRIBUTING.md is enough)

**We focus next on:**
- Hardening `@zimb-bot` (webhook signature, error handling, multi-repo)
- Polishing the `@zimb` extension (/issue command, /status command, /bounties view)
- Promoting to get 10+ bounties → validate the model at scale
