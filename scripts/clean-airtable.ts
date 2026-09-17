// scripts/clean-airtable.ts — Nettoie les tickets + claims de test
// Charge .dev.vars depuis packages/worker/ (ne commit JAMAIS de token dans ce fichier).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDevVars(): Record<string, string> {
  const searchPaths = [
    resolve(process.cwd(), 'packages/worker/.dev.vars'),
    resolve(__dirname, '..', 'packages', 'worker', '.dev.vars'),
    resolve(__dirname, '..', '..', 'packages', 'worker', '.dev.vars'),
  ];
  for (const p of searchPaths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8');
      const out: Record<string, string> = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        out[key] = value;
      }
      return out;
    }
  }
  return {};
}

const vars = loadDevVars();
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? vars.AIRTABLE_BASE_ID ?? '';
const TOKEN = process.env.AIRTABLE_API_KEY ?? vars.AIRTABLE_API_KEY ?? '';

if (!BASE_ID || !TOKEN) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. Fill packages/worker/.dev.vars');
  process.exit(1);
}

const HEADERS = { Authorization: 'Bearer ' + TOKEN };

async function main() {
  // Tickets
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Tickets`, { headers: HEADERS });
  const j: any = await r.json();
  const ticketCount = j.records?.length || 0;
  console.log(`  Tickets actuels: ${ticketCount}`);
  for (const rec of j.records || []) {
    console.log(`    ${rec.fields.id} - ${rec.fields.title || '(sans titre)'}`);
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/Tickets/${rec.id}`, { method: 'DELETE', headers: HEADERS });
    console.log(`      -> supprime`);
  }

  // Claims
  const rc = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Claims`, { headers: HEADERS });
  const jc: any = await rc.json();
  const claimCount = jc.records?.length || 0;
  console.log(`  Claims actuelles: ${claimCount}`);
  for (const rec of jc.records || []) {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/Claims/${rec.id}`, { method: 'DELETE', headers: HEADERS });
    console.log(`    claim ${rec.id} -> supprime`);
  }

  console.log(`\n  [OK] Base vide (${ticketCount} tickets + ${claimCount} claims supprimés)`);
}

main().catch(e => { console.error(e); process.exit(1); });
