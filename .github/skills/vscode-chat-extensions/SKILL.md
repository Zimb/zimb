---
name: vscode-chat-extensions
description: Use when implementing or debugging the Zimb VS Code extension: Chat Participant API for @zimb, slash commands, webview-based ticket form, GitHub OAuth via vscode.authentication, language detection from workspace, and offline mode handling. Last updated 2026-09.
---

# VS Code Chat Extensions — Zimb `@zimb`

## Stack cible

| Item | Valeur |
|---|---|
| Engine | VS Code ≥ 1.94 (pour `vscode.chat` API) |
| Language | TypeScript strict |
| Bundler | esbuild (target node20, format cjs) |
| Auth | `vscode.authentication.getSession('github', ...)` |
| Storage | `SecretStorage` (token), `GlobalState` (prefs), `WorkspaceState` (last used bounty) |
| Chat | `ChatParticipant`, `ChatRequest`, `ChatResponseStream` |

## Doc officielle

- Chat Participant API : <https://code.visualstudio.com/api/extension-guides/chat>
- Extension API : <https://code.visualstudio.com/api>
- Authentication : <https://code.visualstudio.com/api/extension-guides/authentication-providers>
- Webviews : <https://code.visualstudio.com/api/extension-guides/webview>
- Activation events : <https://code.visualstudio.com/api/references/activation-events>

## Patterns Zimb

### Chat participant registration (déjà dans `src/chat/participant.ts`)

```typescript
import * as vscode from 'vscode';

const handler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => {
  if (request.command === 'submit') {
    await vscode.commands.executeCommand('zimb.openForm');
    stream.markdown('🎯 Form opened.');
    return;
  }
  // ... autres commands
};

const participant = vscode.chat.createChatParticipant('zimb', handler);
participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'zimb.png');
```

### GitHub OAuth via VS Code auth API (déjà dans `src/auth/github.ts`)

```typescript
// Le store des tokens est géré par VS Code — JAMAIS en clair dans SecretStorage
async function getGitHubSession() {
  return vscode.authentication.getSession('github', ['repo', 'read:user'], {
    createIfNone: true,  // ouvre le flow OAuth natif VS Code
    silent: false,
  });
}
```

### Webview → extension message passing

```typescript
// Côté extension (panel provider)
class TicketFormProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getHtmlForWebview(webviewView.webview);

    // Reçoit les messages du webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'submit') {
        await apiClient.createTicket(msg.payload);
        vscode.window.showInformationMessage('Ticket submitted!');
      }
    });
  }
}

// Côté webview HTML/JS
const vscode = acquireVsCodeApi();
document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  vscode.postMessage({ command: 'submit', payload: formData });
});
```

### Language detection (déjà dans `src/services/languageDetector.ts`)

```typescript
const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.py': 'Python', '.go': 'Go',
  // ... (40+ extensions)
};

async function detectLanguages(workspaceUri: vscode.Uri): Promise<LanguageCount[]> {
  // Walk recursif (skip node_modules, .git, etc.)
  // Return top 5 avec %ages
}
```

### Offline mode (CT-VSC-03)

```typescript
// Ping l'API au démarrage + à chaque changement de workspace
const healthCheck = async () => {
  try {
    const res = await fetch(`${apiBaseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};

// Dans le formProvider : si offline, désactiver le bouton + afficher bandeau
```

### Manifest (déjà dans `package.json`)

```json
{
  "engines": { "vscode": "^1.94.0" },
  "activationEvents": [
    "onChatParticipant:zimb",
    "onCommand:zimb.openForm",
    "onCommand:zimb.login"
  ],
  "contributes": {
    "chatParticipants": [
      { "id": "zimb", "name": "zimb", "icon": "assets/zimb.png",
        "commands": [
          { "name": "submit", "description": "Open the ticket form" },
          { "name": "status", "description": "Check ticket status" }
        ]
      }
    ],
    "commands": [
      { "command": "zimb.openForm", "title": "Zimb: Submit a ticket", "category": "Zimb" }
    ]
  }
}
```

## Pièges connus

| Piège | Solution |
|---|---|
| L'extension se charge même si l'user ne s'en sert pas | `activationEvents: ["onChatParticipant:zimb"]` (lazy) |
| Le token GitHub est exposé dans le webview | NE JAMAIS passer le token au webview — toutes les API calls passent par l'extension host |
| `acquireVsCodeApi()` ne peut être appelé qu'une fois par webview | Stocker l'API dans une variable globale au top du script |
| `vscode.authentication.getSession` ouvre une popup OAuth | Utiliser `silent: true` au boot pour vérifier sans popup |
| `webview.html` doit être statique ou passé via `asWebviewUri` | Ne pas référencer des fichiers locaux directement |
| Le `workspaceFolders[0]` peut être `undefined` | Defensive: `vscode.workspace.workspaceFolders?.[0]` |
| Les chemins Windows utilisent `\` vs `/` | Utiliser `path.posix` ou `vscode.Uri` partout |
| Le `chatParticipant` n'est invoqué que si l'user tape `@zimb` dans Copilot | OK — c'est attendu. Ne pas inviter automatiquement |
| L'extension doit gérer `CancellationToken` | Vérifier `token.isCancellationRequested` avant chaque await long |

## Checklist pré-codage

- [ ] L'extension a-t-elle un `engines.vscode: ^1.94.0` (sinon `vscode.chat` indispo) ?
- [ ] Les activation events sont-ils minimaux (pas `*`) ?
- [ ] L'icône `assets/zimb.png` existe-t-elle (24x24 transparent) ?
- [ ] Le token GitHub passe-t-il UNIQUEMENT par l'extension host (jamais au webview) ?
- [ ] Le webview a-t-il un CSP strict (`script-src 'self'`) ?
- [ ] Le mode offline est-il géré (banner + bouton disabled) ?
- [ ] Le `chatParticipant.id` (`'zimb'`) correspond-il au `package.json` ?

## Build & publish

```bash
# Local dev (dans Extension Development Host)
npm run build && code .  # puis F5

# Package .vsix
vsce package

# Publish (Microsoft Partner account requis)
vsce publish
```

CI : voir `.github/workflows/ci.yml` — pour le moment, l'extension est buildée et testée mais **pas auto-publiée** (action manuelle).

## Liens internes

- Spec extension : [../../../SPECIFICATIONS.md §3.3](../../../SPECIFICATIONS.md#33-extension-vs-code--copilot)
- Tests E2E : [../../../recettes/01-creation-ticket.md](../../../recettes/01-creation-ticket.md) (CT-VSC-*)
- Agent dédié : `VS Code Extension` (voir `.github/agents/`)
