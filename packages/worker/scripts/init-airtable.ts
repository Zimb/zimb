/**
 * init-airtable.ts — Bootstrap the Zimb Airtable sandbox.
 *
 * Creates the 2 tables (Tickets, Claims) with all required columns and
 * single-select / multi-select options. Idempotent: skips tables/fields
 * that already exist.
 *
 * Usage:
 *   1. Fill AIRTABLE_API_KEY + AIRTABLE_BASE_ID in packages/worker/.dev.vars
 *   2. From anywhere: npx tsx packages/worker/scripts/init-airtable.ts
 *
 * Reference: SPECIFICATIONS.md §A
 * Skill: .github/skills/airtable-scripting/SKILL.md
 */

// ─── .dev.vars loader (no external deps) ──────────────────────
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Search .dev.vars in (in order):
 *   1. process.cwd() / .dev.vars
 *   2. <script_dir>/.dev.vars  (next to the script)
 *   3. <script_dir>/../.dev.vars  (= packages/worker/.dev.vars)
 *   4. <script_dir>/../../../.dev.vars  (= monorepo root, fallback)
 *   5. $AIRTABLE_API_KEY / $AIRTABLE_BASE_ID env vars (override)
 */
function loadDevVars(): { vars: Record<string, string>; source: string } {
  const searchPaths = [
    resolve(process.cwd(), '.dev.vars'),
    resolve(__dirname, '.dev.vars'),
    resolve(__dirname, '..', '.dev.vars'),
    resolve(__dirname, '..', '..', '..', '.dev.vars'),
  ];

  // Check env vars first (highest priority)
  const fromEnv: Record<string, string> = {};
  if (process.env.AIRTABLE_API_KEY) fromEnv.AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  if (process.env.AIRTABLE_BASE_ID) fromEnv.AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (fromEnv.AIRTABLE_API_KEY && fromEnv.AIRTABLE_BASE_ID) {
    return { vars: fromEnv, source: 'environment variables' };
  }

  for (const p of searchPaths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8');
        const result: Record<string, string> = { ...fromEnv };
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          let value = trimmed.slice(eqIdx + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          result[key] = value;
        }
        return { vars: result, source: p };
      } catch {
        // try next path
      }
    }
  }
  return { vars: {}, source: 'none' };
}

const { vars, source } = loadDevVars();
const TOKEN = vars.AIRTABLE_API_KEY ?? process.env.AIRTABLE_API_KEY;
const BASE_ID = vars.AIRTABLE_BASE_ID ?? process.env.AIRTABLE_BASE_ID;

if (!TOKEN || !BASE_ID) {
  console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.');
  console.error('   Fill them in packages/worker/.dev.vars and re-run.');
  console.error('   Or set AIRTABLE_API_KEY and AIRTABLE_BASE_ID env vars.');
  console.error('   See packages/worker/dev.vars.example for the template.');
  process.exit(1);
}

const BASE_URL = 'https://api.airtable.com/v0';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ─── Schema definitions ───────────────────────────────────────
interface FieldDef {
  name: string;
  type: string;
  options?: Record<string, unknown>;
  description?: string;
}

interface TableDef {
  name: string;
  description: string;
  fields: FieldDef[];
}

const TICKETS_TABLE: TableDef = {
  name: 'Tickets',
  description: 'Zimb tickets — source of truth for bug bounty workflow',
  fields: [
    { name: 'id', type: 'singleLineText', description: 'Zimb ID T-XXXX (index unique)' },
    { name: 'title', type: 'singleLineText' },
    { name: 'description', type: 'multilineText' },
    {
      name: 'bounty',
      type: 'number',
      options: { precision: 0 },
      description: 'Bounty in EUR cents (e.g. 5000 = 50€)',
    },
    {
      name: 'urgency',
      type: 'singleSelect',
      options: { choices: [{ name: 'low' }, { name: 'medium' }, { name: 'high' }, { name: 'critical' }] },
    },
    {
      name: 'languages',
      type: 'multipleSelects',
      options: {
        choices: [
          { name: 'TypeScript' },
          { name: 'JavaScript' },
          { name: 'Python' },
          { name: 'Go' },
          { name: 'Rust' },
          { name: 'Java' },
          { name: 'Kotlin' },
          { name: 'Ruby' },
          { name: 'PHP' },
          { name: 'C#' },
          { name: 'C++' },
          { name: 'C' },
          { name: 'Other' },
        ],
      },
    },
    { name: 'repo_url', type: 'url' },
    {
      name: 'status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'open' },
          { name: 'claimed' },
          { name: 'in_progress' },
          { name: 'delivered' },
          { name: 'validated' },
          { name: 'auto_validated' },
          { name: 'disputed' },
          { name: 'refunded' },
          { name: 'expired' },
        ],
      },
    },
    { name: 'channel', type: 'singleSelect', options: { choices: [{ name: 'web' }, { name: 'vscode' }] } },
    {
      name: 'created_at',
      type: 'dateTime',
      options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' },
    },
    { name: 'created_by', type: 'singleLineText', description: 'User ID (GitHub login)' },
    { name: 'claimed_by', type: 'singleLineText', description: 'Senior who claimed it' },
    { name: 'delivered_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'validated_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'auto_validated_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'dispute_opened_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'sla_dispute_deadline', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'assigned_reviewer_id', type: 'singleLineText' },
    { name: 'stripe_payment_intent_id', type: 'singleLineText' },
  ],
};

const CLAIMS_TABLE: TableDef = {
  name: 'Claims',
  description: 'Lock & Timer — one row per claim attempt',
  fields: [
    { name: 'ticket_id', type: 'singleLineText', description: 'Zimb ID T-XXXX (links to Tickets.id)' },
    { name: 'senior_id', type: 'singleLineText', description: 'GitHub login' },
    { name: 'claimed_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'expires_at', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' } },
    { name: 'status', type: 'singleSelect', options: { choices: [{ name: 'active' }, { name: 'expired' }, { name: 'completed' }] } },
  ],
};

// ─── API helpers ──────────────────────────────────────────────
async function fetchSchema(): Promise<{ tables: Array<{ id: string; name: string; fields: Array<{ name: string }> }> }> {
  const res = await fetch(`${BASE_URL}/meta/bases/${BASE_ID}/tables`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch schema (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ tables: Array<{ id: string; name: string; fields: Array<{ name: string }> }> }>;
}

async function createTable(table: TableDef): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: table.name,
      description: table.description,
      fields: table.fields.map((f) => ({ name: f.name, type: f.type, ...(f.options ? { options: f.options } : {}), ...(f.description ? { description: f.description } : {}) })),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create table ${table.name} (${res.status}): ${body}`);
  }
  return (await res.json()) as { id: string };
}

async function addMissingFields(tableId: string, existingFieldNames: Set<string>, fields: FieldDef[]): Promise<void> {
  for (const field of fields) {
    if (existingFieldNames.has(field.name)) {
      console.log(`  ⏭️  Field "${field.name}" already exists, skipping`);
      continue;
    }
    console.log(`  ➕ Adding field "${field.name}" (${field.type})`);
    const res = await fetch(`${BASE_URL}/meta/bases/${BASE_ID}/tables/${tableId}/fields`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: field.name,
        type: field.type,
        ...(field.options ? { options: field.options } : {}),
        ...(field.description ? { description: field.description } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`  ⚠️  Failed to add field "${field.name}" (${res.status}): ${body.slice(0, 200)}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`🔧 Zimb Airtable sandbox init\n`);
  console.log(`   Base ID: ${BASE_ID}`);
  console.log(`   Token:   ${TOKEN.slice(0, 12)}…\n`);

  const schema = await fetchSchema();
  const existingTables = new Map(schema.tables.map((t) => [t.name, t]));

  for (const def of [TICKETS_TABLE, CLAIMS_TABLE]) {
    const existing = existingTables.get(def.name);
    if (existing) {
      console.log(`✅ Table "${def.name}" already exists (id=${existing.id})`);
      console.log('   Checking for missing fields…');
      const existingFieldNames = new Set(existing.fields.map((f) => f.name));
      await addMissingFields(existing.id, existingFieldNames, def.fields);
    } else {
      console.log(`📋 Creating table "${def.name}" with ${def.fields.length} fields…`);
      const result = await createTable(def);
      console.log(`   ✅ Created (id=${result.id})`);
    }
    console.log('');
  }

  console.log('🎉 Done! Your Airtable sandbox is ready for M1+M2.');
  console.log('   Next step: npm run smoke:test (or the manual curl commands in packages/worker/README.md).');
}

main().catch((err) => {
  console.error('\n❌ Init failed:', err.message);
  process.exit(1);
});
