# `@zimb` chat commands

> Reference for the slash commands exposed by the `@zimb` VS Code extension.
> Updated for **v0.1.0** (October 2026).

All commands are invoked from GitHub Copilot Chat in VS Code by typing `@zimb <command>`. The `@zimb` prefix is mandatory — without it, the message goes to the default chat participant.

---

## 📋 Index

| Command | Purpose | Network? |
|---|---|---|
| [`/submit`](#-submit) | Open the side-panel form (explicit) | ❌ |
| [`/redact`](#-redact) | Compose a draft bounty locally (offline preview) | ❌ |
| [`/fix`](#-fix) | Compose using preceding chat history as context | ❌ |
| [`/post`](#-post) | Publish the last draft to GitHub | ✅ |
| [`/discard`](#-discard) | Throw away the current draft | ❌ |
| [`/issue`](#-issue) | One-shot: `/redact` + `/post` together | ✅ |
| [`/status`](#-status) | Read ticket status via api.zimb.app | ✅ |
| [`/bounties`](#-bounties) | List all bounties in the current repo | ✅ |
| [`/notif`](#-notif) | Show notifications poller status | ❌ |

---

## Inline directives (shared by all `compose` commands)

The `compose` family (`/redact`, `/fix`, `/issue`) accepts these inline flags in the prompt:

| Flag | Alias | Values | Default |
|---|---|---|---|
| `-l <lang>` | `--lang` | `en` \| `fr` \| `es` \| `de` | auto-detected from prompt |
| `-u <urgency>` | `--urgency` | `low` \| `medium` \| `high` \| `critical` | `medium` |
| `-b <amount>` | `--bounty` | integer 5..5000 | `0` (no bounty) |
| `-c <currency>` | `--currency` | `EUR` \| `USD` \| `AUD` \| `GBP` | `EUR` |

When you omit a flag, the default is shown as `_default_` in the chat preview so you can see what Zimb filled in for you. Flags you pass explicitly are not annotated.

### Examples

```
@zimb /redact je n'arrive pas à installer mon app github au niveau de l'organisation -l en
@zimb /fix same bug as discussed -u critical -b 100
@zimb /issue CORS preflight failing on /api/users -b 50 -u high -c EUR
```

---

## `/submit`

Open the Zimb side-panel form pre-filled with your chat prompt.

**Syntax**: `@zimb /submit [prompt]`

**Network**: ❌ no

**Behavior**:
1. Opens the webview form
2. Pre-fills the title + description fields with `prompt`
3. You can edit, attach files, set bounty, then click **Submit**

Use when you prefer a **visual form** over a chat-only flow.

---

## `/redact`

**Compose a bounty draft locally** and show a preview. The draft is saved to `workspaceState` (survives VS Code reload) but **not** posted to GitHub.

**Syntax**: `@zimb /redact <description> [flags]`

**Network**: ❌ no

**Behavior**:
1. Detects the current repo from the workspace's git remote
2. Parses inline flags (see [directives](#inline-directives-shared-by-all-compose-commands))
3. Calls the active Copilot chat model to compose a structured `StructuredIssue`
4. Falls back to heuristic composer if no model is available (warning shown)
5. Persists the draft in `workspaceState` per repo (`zimb.draft.<owner>:<repo>`)
6. Shows a preview in the chat

**Example output**:

```
📝 Draft saved for Zimb/zimb (no network call yet).

🌐 en · medium (default) · **50 EUR**
✨ LLM composed: kind=**bug**

**Preview**

> **Cannot install GitHub App at organization level**
>
> User cannot install a GitHub App on an organization; the app
> appears in My Apps but only the Edit option is shown.

Run @zimb /post to publish, or @zimb /redact … to rewrite,
or @zimb /discard to throw away.
```

**Notes**:
- The LLM is **always preferred** when Copilot is signed in.
- Re-running `/redact` overwrites the previous draft (last-write-wins).
- The draft is **isolated per repo** — `Zimb/zimb` and `Zimb/api` have separate drafts.

---

## `/fix`

Same as `/redact` but **forces the LLM to use the preceding chat history** as troubleshooting context.

**Syntax**: `@zimb /fix [hint] [flags]`

**Network**: ❌ no (only LLM call, no GitHub)

**When to use**:
After a debugging session where you and Copilot have exchanged 5-10 messages of trial-and-error. The LLM extracts:
- The **exact error message** you pasted (verbatim)
- The **commands / clicks / config changes** already attempted
- The **AI's earlier guesses** that you pushed back on
- The **root cause hypothesis** you're converging on

**Hint can be short** or empty — Zimb defaults to `Summarise the preceding conversation into a structured GitHub Issue.`

**Example**:

```
# You spent 20 min debugging with @github in chat
[chat history: error message, stack trace, attempted fixes, hypothesis]

You> @zimb /fix -u critical -b 100

🧠 Using 10 prior turns as troubleshooting context.

📝 Draft saved for Zimb/zimb (no network call yet).
[...]
```

---

## `/post`

**Publish the last draft** to GitHub as a real Issue on the current repo.

**Syntax**: `@zimb /post`

**Network**: ✅ GitHub (POST + possibly PATCH)

**Behavior**:
1. Reads the draft from `workspaceState` for the current repo
2. Validates it exists (errors clearly if not)
3. Warns if the draft is older than 60 minutes
4. POSTs the issue to GitHub via Octokit
5. **Two-pass creation** to substitute `#TBD` with the real issue number:
   - POST → GitHub returns the new issue with `#N`
   - PATCH → rewrites the body with `#N` substituted everywhere
6. Shows a toast + chat confirmation
7. **Clears the draft** on success (so accidental re-post doesn't duplicate)

**Failure handling**: If GitHub returns 4xx/5xx, the draft is **kept** so you can retry `/post`.

**Output**:

```
✅ Bounty published on Zimb/zimb:
   [#6 Cannot install GitHub App at organization level]
   https://github.com/Zimb/zimb/issues/6

Draft cleared. Run @zimb /redact … to start a new one.
```

---

## `/discard`

Throw away the current draft without publishing.

**Syntax**: `@zimb /discard`

**Network**: ❌ no

**Behavior**: Clears the `zimb.draft.<owner>:<repo>` key in `workspaceState`.

**Use cases**:
- Started a draft by mistake
- Want to start fresh
- Draft is stale and you want to `/redact` again

---

## `/issue`

**Shortcut for `/redact` then `/post`** in one shot. Kept for backward compatibility — the two-step flow is the recommended path.

**Syntax**: `@zimb /issue <description> [flags]`

**Network**: ✅ GitHub (single POST, no preview)

**Behavior**:
1. Composes the structured issue (same as `/redact`)
2. **Also persists it as a draft** so `/post` retry still works if step 3 fails
3. Immediately POSTs to GitHub

Use only when you're **confident** in the prompt and don't need a preview.

---

## `/status`

Read the status of a ticket via the Zimb Worker API (`api.zimb.app`).

**Syntax**: `@zimb /status <ticket-id>`

**Network**: ✅ Worker API

**Example**:

```
You> @zimb /status T-0042

📋 Ticket T-0042
- Status: claimed
- Bounty: 50€
- Claimed by: @senior-dev
```

**Errors**:
- `❌ Not signed in to GitHub.` — run `Zimb: Login with GitHub` first
- `❌ Could not fetch ticket T-XXXX` — check the ticket ID or the Worker is down

---

## `/bounties`

List all bounties in the current repo (mirror of the sidebar tree view).

**Syntax**: `@zimb /bounties`

**Network**: ✅ GitHub (one GET per state)

**Behavior**: Fetches all issues labelled `bounty` in the current repo (open + closed), groups them by status, and renders a markdown summary in chat.

**Output**:

```
🎯 Bounties in Zimb/zimb

🟢 OPEN (3)
- #5 CORS error on /api/users · 50€ → @senior
- #6 Cannot install GitHub App · 30€
- #8 docs(spec): English translation · 0€

🟡 CLAIMED (1)
- #7 Fix #6: Debug bounty · 100€ → @claimed-by

🚀 DELIVERED (0)
✅ CLOSED (0)
```

---

## `/notif`

Show the status of the desktop notifications poller.

**Syntax**: `@zimb /notif`

**Network**: ❌ no (read-only)

**Behavior**: Displays a message explaining what events trigger a popup and how to dismiss them. Doesn't force a poll (the poller runs every 60s in the background regardless).

---

## Under the hood

| Concern | File |
|---|---|
| Slash command dispatch | `packages/extension/src/chat/participant.ts` |
| LLM composition (Copilot chat model) | `packages/extension/src/chat/issueBuilder.ts` |
| Heuristic fallback (no LLM) | `packages/extension/src/chat/issueBuilder.types.ts` |
| Inline directive parsing | `packages/extension/src/chat/directivesParser.ts` |
| Draft persistence | `packages/extension/src/chat/draftStore.ts` |
| GitHub issue creation (2-pass) | `packages/extension/src/services/issueCreator.ts` |
| Bounty body rendering | `packages/extension/src/chat/bountyRenderer.ts` |
| Notifications poller | `packages/extension/src/services/notificationsPoller.ts` |
| Status bar / sidebar UI | `packages/extension/src/extension.ts` |

See [SPECIFICATIONS.md §4](../SPECIFICATIONS.md) for the full architecture.

---

## Error reference

| Symptom | Cause | Fix |
|---|---|---|
| `📝 Let me open the form so you can describe your bug…` after typing `/redact` | Stale `.vsix` installed (extension predates `/redact`) | `code --install-extension zimb-vscode-0.1.0.vsix --force` then reload VS Code |
| `_(No Copilot model available — using fallback template.)_` | Copilot not signed in, or chat model can't be invoked | Sign in to Copilot, or accept the fallback output |
| `📭 No draft to post for owner/repo.` | You typed `/post` without running `/redact` first | Run `/redact <description>` first |
| `❌ No GitHub repo detected in the current workspace.` | Workspace has no `git remote.origin.url` pointing to GitHub | Open a folder that's a git clone of your GitHub project |
| `❌ Could not publish issue: GitHub API 401` | GitHub token expired or revoked | Sign out and back in via `Zimb: Login with GitHub` |
| Toast notification disappears too fast | (Fixed in v0.1.0) | Update extension; check the **Zimb** status bar item and the **Notifications** sidebar view instead |

---

_Last updated: 2026-09-17 — matches the .vsix shipped in release v0.1.0_
