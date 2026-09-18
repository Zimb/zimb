---
name: github-apps-zimb-bot
description: Use when implementing the @zimb-bot GitHub App: creating private repos zimb-ticketId, inviting/revoking senior collaborators with permission push, handling push and pull_request webhooks, signature verification, or fine-grained permission management. Last updated 2026-09.
---

# GitHub Apps — `@zimb-bot`

## Stack cible

| Item | Valeur |
|---|---|
| Type | GitHub App (pas OAuth App, pas PAT) |
| Install location | Org `zimb-app` (single org en V1) |
| Auth | `@octokit/auth-app` (RS256 JWT) |
| SDK | `@octokit/rest` ≥ 21.x + `@octokit/webhooks` ≥ 13.x |
| Permissions (V1) | `contents: write`, `metadata: read`, `members: write` |
| Senior permission | `push` (JAMAIS `admin` ni `maintain`) |
| Webhook secret | `GITHUB_WEBHOOK_SECRET` (HMAC SHA256) |

## Doc officielle

- GitHub Apps : <https://docs.github.com/en/apps>
- Creating GitHub Apps : <https://docs.github.com/en/apps/creating-github-apps>
- Permissions : <https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps>
- Webhooks : <https://docs.github.com/en/webhooks>
- Octokit : <https://octokit.github.io/octokit.js/>
- Fine-grained tokens : <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens>

## Patterns Zimb

### Auth flow App (RS256 JWT)

```typescript
import { App } from 'octokit';

const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,    // ← \n must be preserved!
  webhooks: { secret: env.GITHUB_WEBHOOK_SECRET },
});

// Per-installation: get an Octokit instance with installation token
const octokit = await app.getInstallationOctokit(installationId);
```

### Créer un repo privé à la création d'un ticket (CT-GH-01)

```typescript
export async function createTicketRepo(ticketId: string, title: string) {
  const response = await octokit.rest.repos.createInOrg({
    org: 'zimb-app',
    name: `zimb-${ticketId}`,
    private: true,
    description: `Zimb ticket ${ticketId} — ${title}`,
    auto_init: true,
  });
  return response.data.html_url; // → Airtable repoUrl
}
```

### Inviter un senior au claim (CT-GH-02) — `push` only

```typescript
export async function inviteSeniorToRepo(ticketId: string, seniorGhLogin: string) {
  // ⚠️ ATTENTION: toujours 'push', jamais 'admin' ou 'maintain'
  await octokit.rest.repos.addCollaborator({
    owner: 'zimb-app',
    repo: `zimb-${ticketId}`,
    username: seniorGhLogin,
    permission: 'push',           // ← HARD LIMIT (CT-GH-03)
  });
}
```

### Révoquer l'accès à la clôture (CT-GH-04/05/06)

```typescript
export async function revokeSeniorFromRepo(ticketId: string, seniorGhLogin: string) {
  try {
    await octokit.rest.repos.removeCollaborator({
      owner: 'zimb-app',
      repo: `zimb-${ticketId}`,
      username: seniorGhLogin,
    });
  } catch (err) {
    // 404 = déjà révoqué, ok silencieux
    if ((err as { status?: number }).status !== 404) throw err;
  }
}
```

### Mapping statut ticket → révocation

| Statut ticket | Révoquer ? | Pourquoi |
|---|---|---|
| `validated` | ✅ Oui | Ticket clôturé |
| `auto_validated` | ✅ Oui | Ticket clôturé |
| `expired` | ✅ Oui | Claim échoué |
| `refunded` | ✅ Oui | Litige perdu |
| `disputed` | ⏸️ **NON** | Suspendre jusqu'au verdict |
| `open` / `claimed` / `in_progress` / `delivered` | ❌ Non | Senior a besoin d'accéder |

### Webhook signature verification

```typescript
import { Webhooks } from '@octokit/webhooks';

const webhooks = new Webhooks({ secret: env.GITHUB_WEBHOOK_SECRET });

// In Worker fetch handler:
if (request.url.endsWith('/webhooks/github') && request.method === 'POST') {
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return new Response('Missing signature', { status: 401 });

  const body = await request.text(); // RAW body required
  const isValid = await webhooks.verify(body, signature);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(body);
  await webhooks.receive(event);
  return new Response('OK');
}

webhooks.on('push', async (event) => {
  // event.payload.ref → 'refs/heads/fix/T-42'
  if (event.payload.ref.startsWith('refs/heads/fix/')) {
    const ticketId = event.payload.ref.split('/').pop();
    await markTicketDelivered(ticketId);
  }
});
```

### Archivage du repo (30 jours post-clôture)

```typescript
export async function archiveRepo(ticketId: string) {
  await octokit.rest.repos.update({
    owner: 'zimb-app',
    repo: `zimb-${ticketId}`,
    archived: true,
  });
}
```

## Pièges connus

| Piège | Solution |
|---|---|
| `privateKey` perd ses `\n` quand lu depuis `wrangler secret` | Stocker en base64 OU utiliser `env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n')` |
| App permissions are org-level, not per-repo | C'est normal — on gère l'accès par `addCollaborator` |
| `addCollaborator` retourne 201 même si l'user existe déjà (idempotent) | Toujours vérifier le body, pas le status code |
| Fine-grained PAT ≠ GitHub App tokens | Pour `@zimb-bot`, **toujours** App tokens, jamais PAT |
| GitHub rate limit = 5000 req/h par App installation | Implémenter une queue (KV) si burst prévisible |
| `webhooks.verify` lit le body comme string | NE PAS appeler `request.json()` avant `verify` |
| `privateKey` PEM doit commencer par `-----BEGIN RSA PRIVATE KEY-----` | Si format PKCS#8 (`BEGIN PRIVATE KEY`), Octokit le supporte aussi |
| Le repo peut être supprimé entre le claim et le push | Tester avec `GET /repos/{owner}/{repo}` avant chaque op |
| Installation organisation bloquée (seul le bouton "Edit" apparaît) | Définir "Where can this GitHub App be installed?" sur "Any account" (ou transférer l'App à l'organisation sous Advanced). L'utilisateur doit être Organization Owner ou GitHub App Manager. Détails: `docs/GITHUB_APP_ORG_INSTALLATION.md` |

## Checklist pré-codage

- [ ] L'octokit instance est-elle obtenue via `app.getInstallationOctokit()` (pas un PAT) ?
- [ ] La permission est-elle `push` (jamais `admin`/`maintain`) ?
- [ ] Le mapping statut → révocation est-il respecté (cf. tableau) ?
- [ ] La signature webhook est-elle vérifiée AVANT tout traitement ?
- [ ] Le `privateKey` est-il restauré avec `\n` corrects ?
- [ ] Aucun humain Zimb n'a-t-il d'accès permanent sur les repos `zimb-*` ?

## Liens internes

- Spec accès GH : [../../../SPECIFICATIONS.md §4.3](../../../SPECIFICATIONS.md#43-gestion-des-accès-github-via-zimb-bot)
- Tests E2E : [../../../recettes/03-github-access.md](../../../recettes/03-github-access.md)
- Agent dédié : `GitHub Bot` (voir `.github/agents/`)
