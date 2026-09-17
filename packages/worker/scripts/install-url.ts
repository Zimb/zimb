/**
 * install-url.ts — Show the exact URL to install @zimb-bot on Zimb-app,
 * bypassing the broken "Install App" UI list.
 *
 * The proper URL is:
 *   https://github.com/apps/<app-slug>/installations/new?target_id=<org-id>
 *
 * The `target_id` param forces the install dialog to focus on the org,
 * even if the org hasn't shown up in the dropdown yet.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env: Record<string, string> = {};
{
  const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf8');
  let inTriple = false, k = '', v: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (inTriple) {
      if (line.startsWith('"""')) { env[k] = v.join('\n'); inTriple = false; k=''; v=[]; continue; }
      v.push(line); continue;
    }
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    k = m[1]!;
    let val = (m[2] ?? '').trim();
    if (val.startsWith('"""')) { inTriple = true; val = val.slice(3); v = val === '' ? [] : [val]; continue; }
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[k] = val;
  }
}

const APP_ID = env.GITHUB_APP_ID ?? '';
const ORG_ID = '330249037'; // we already know this from earlier check

// Get the app slug (e.g., "zimb-bot") via the App metadata.
// We don't have a JWT here, but we know it's id=4972133.
// We can fetch via the public endpoint /apps/{app_slug} — but we need the slug.
// Easier: just use known slug from the URL we saw earlier.
const APP_SLUG = 'zimb-bot';

const installUrl = `https://github.com/apps/${APP_SLUG}/installations/new?target_id=${ORG_ID}`;

console.log('');
console.log('──────────────────────────────────────────────────────');
console.log('  Install @zimb-bot on Zimb-app');
console.log('──────────────────────────────────────────────────────');
console.log('');
console.log('  App ID :', APP_ID);
console.log('  App slug:', APP_SLUG);
console.log('  Org ID  :', ORG_ID);
console.log('');
console.log('  👉 Open this URL in your browser:');
console.log('');
console.log('     ' + installUrl);
console.log('');
console.log('  Then click "Install" (it should land directly on the Zimb-app');
console.log('  install confirmation screen, bypassing the dropdown).');
console.log('');
