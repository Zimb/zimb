# Recette 10 — Senior claims a bounty via `@zimb-bot claim` comment

> **Pivot note (Sept 2026)**: This recipe documents the **V2 GitHub-native flow**. It replaces the original V1 marketplace flow where seniors browsed a Kanban at `app.zimb.app`. See `STRATEGY.md` §4 for the full E2E diagram.

## Overview

| Step | Actor | Action |
|------|-------|--------|
| 1 | Vibe Coder | Creates a GitHub issue + adds label `bounty` |
| 2 | Senior | Sees the issue (GitHub feed, search, or `@zimb` extension sidebar) |
| 3 | Senior | Comments `@zimb-bot claim` |
| 4 | `@zimb-bot` | Verifies signature, creates private repo, grants push access, assigns issue |
| 5 | Senior | Clones the repo, fixes the bug, opens PR |
| 6 | Maintainer | Reviews, merges, done |

---

## CT-BOT-01 — Happy path: senior claims a bounty

**Given** a GitHub issue #42 exists on `Zimb/zimb` with label `bounty`
**And** `@zimb-bot` is installed on `Zimb/zimb`
**And** the senior `nazasnow` is authenticated via GitHub

**When** `nazasnow` comments `@zimb-bot claim` on issue #42

**Then** `@zimb-bot` creates a private repo `zimb/zimb-#42` (or `zimb-{T-XXXX}`)
**And** `@zimb-bot` adds `nazasnow` as a collaborator with `push` permission
**And** `@zimb-bot` assigns the issue to `nazasnow`
**And** `@zimb-bot` replies with:
  - "You're assigned. Repo: https://github.com/Zimb/zimb-#42"
  - Clone snippet
**And** the Cloudflare Worker logs the claim in Airtable:
  - Table `Claims`, new row with `ticket_id`, `senior_id=nazasnow`, `status=active`, `expires_at=now+24h`

---

## CT-BOT-02 — Signature verification (security)

**Given** a webhook POST arrives at `https://api.zimb.app/webhooks/github`
**And** the `X-Hub-Signature-256` header is missing

**When** the Worker handles the request

**Then** the Worker returns `401 Unauthorized`
**And** the issue is not modified
**And** no repo is created
**And** the Worker logs `[webhook] rejected: invalid signature`

---

## CT-BOT-03 — Signature verification (happy path)

**Given** a webhook POST arrives at `https://api.zimb.app/webhooks/github`
**And** the `X-Hub-Signature-256` header is `sha256=<valid HMAC-SHA256 of body using GITHUB_WEBHOOK_SECRET>`

**When** the Worker handles the request

**Then** the signature is accepted
**And** the action is processed normally

---

## CT-BOT-04 — Wrong comment text is ignored

**Given** an issue with label `bounty`

**When** a user comments `@zimb-bot please look at this` (not the `claim` keyword)

**Then** the bot does **not** create a repo
**And** the bot does **not** assign anyone
**And** the bot does **not** reply

---

## CT-BOT-05 — Replay protection

**Given** `nazasnow` already has an active claim on issue #42

**When** `nazasnow` comments `@zimb-bot claim` again on the same issue

**Then** the bot replies: "You're already assigned to this issue. Push access is still active."
**And** the bot does **not** create a duplicate repo

---

## CT-BOT-06 — Bot installed but user not authorized

**Given** `@zimb-bot` is installed on `Zimb/zimb` only
**And** the senior tries to claim a bounty on a different org's repo where the bot is NOT installed

**When** the senior comments `@zimb-bot claim`

**Then** the bot is silent (no response — GitHub only delivers webhooks for installed repos)
**And** nothing happens server-side

---

## CT-BOT-07 — Issue without `bounty` label

**Given** a GitHub issue without the `bounty` label

**When** a senior comments `@zimb-bot claim`

**Then** the bot replies: "Only `bounty`-labeled issues can be claimed. Ask the maintainer to add the label."
**And** no repo is created
**And** no assignment happens

---

## CT-BOT-08 — Senior pushes fix and opens PR

**Given** `nazasnow` has push access to `zimb/zimb-#42`

**When** `nazasnow`:
  ```bash
  git clone git@github.com:Zimb/zimb-#42.git
  cd zimb-#42
  git checkout -b zimb/#42-fix-thing
  # make change
  git commit -m "Fix: ..."
  git push -u origin zimb/#42-fix-thing
  ```

**And** opens a PR against `Zimb/zimb` (the original repo)

**Then** the PR appears in the original repo
**And** `@zimb-bot` comments on the issue: "PR opened by nazasnow: <link>"
**And** the Airtable `Claims.status` is updated to `delivered`

---

## CT-BOT-09 — Claim expiry (7 days)

**Given** `nazasnow` claimed issue #42
**And** 7 days have passed without any push to `zimb/zimb-#42`

**When** the Worker cron runs (every 1h)

**Then** the bot revokes `nazasnow`'s push access to the repo
**And** the bot comments: "Claim expired. Issue is open again."
**And** the Airtable `Claims.status` is updated to `expired`
**And** the original issue's assignee is cleared

---

## CT-BOT-10 — Maintainer merges PR

**Given** `nazasnow` opened PR #43 on `Zimb/zimb`
**And** the PR is linked to issue #42

**When** the maintainer merges the PR

**Then** `@zimb-bot` comments on issue #42: "Resolved by @nazasnow. Closing."
**And** the bot closes the issue
**And** the Airtable `Claims.status` is updated to `validated`
**And** `nazasnow` receives a `verified-by-zimb` badge

---

## Implementation references

- Worker webhook receiver: `packages/worker/src/routes/webhooks.ts`
- GitHub App auth + repo creation: `packages/worker/src/adapters/githubBot.real.ts`
- Signature verification: `packages/worker/src/services/webhookSignature.ts`
- Issue body template: `recettes/99-bounty-body-template.md`
- Templates: `.github/ISSUE_TEMPLATE/bounty.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- Bot install instructions: `CONTRIBUTING.md` §"Install the @zimb-bot GitHub App"

## Related scenarios

- CT-WEB-01 to CT-WEB-05: ticket creation via web (still works, optional now)
- CT-VSC-01 to CT-VSC-03: ticket creation via VS Code extension (still works, optional now)
- CT-LOCK-01 to CT-LOCK-06: claim locking via Worker API (M1/M2 — used internally by the bot)
