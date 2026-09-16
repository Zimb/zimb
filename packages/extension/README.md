# `@zimb/extension` — VS Code / Copilot Chat Participant

> Submit a debug bounty from VS Code in one command. Get unblocked in 45 minutes.

## Features

- **`@zimb submit`** — open the ticket form (side-panel webview), prefilled from workspace context.
- **`@zimb status T-1234`** — check the status of a ticket.
- **`@zimb <prompt>`** — open the form with the prompt as description draft.
- **Auto-detect** — workspace languages, GitHub repo URL, current branch.
- **Offline mode** — form disabled when API unreachable (CT-VSC-03).

## Local development

```bash
# 1. Install dependencies (from monorepo root)
npm install

# 2. Build the extension
npm run build -w zimb-vscode

# 3. Open VS Code in this directory
code .

# 4. Press F5 to launch the Extension Development Host
# → A new VS Code window opens with the extension loaded
# → Try: @zimb submit
```

## Project structure

```
src/
├── extension.ts              # activate() / deactivate()
├── chat/
│   └── participant.ts        # @zimb chat handler (SPEC §3.3)
├── commands.ts               # zimb.openForm, zimb.login, zimb.logout
├── auth/
│   └── github.ts             # GitHub OAuth wrapper
├── services/
│   ├── apiClient.ts          # REST client for api.zimb.app
│   ├── languageDetector.ts   # Workspace language scan (CT-VSC-02)
│   └── repoDetector.ts       # Git remote URL detection
└── webviews/                 # Side-panel ticket form (HTML/JS/CSS)
    └── ticketForm/
```

## Configuration

| Setting | Default | Description |
|---|---|---|
| `zimb.api.baseUrl` | `https://api.zimb.app` | API base URL |
| `zimb.bounty.defaultAmount` | `30` | Default bounty in EUR |

## Testing

```bash
npm test -w zimb-vscode
npm run test:watch -w zimb-vscode
```

## Package & publish

```bash
# Build a .vsix
npm run package -w zimb-vscode

# Publish to marketplace (requires Azure DevOps PAT)
npm run publish -w zimb-vscode
```
