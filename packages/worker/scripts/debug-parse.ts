import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf8');
const env: Record<string, string> = {};
let inTriple = false;
let currentKey = '';
let currentValue: string[] = [];
for (const line of raw.split(/\r?\n/)) {
  // 1) Inside a triple-quoted value: accumulate or close
  if (inTriple) {
    if (line.startsWith('"""')) {
      env[currentKey] = currentValue.join('\n');
      inTriple = false;
      currentKey = '';
      currentValue = [];
      continue;
    }
    currentValue.push(line);
    continue;
  }
  // 2) Outside: only match KEY=VALUE assignments (not PEM lines)
  const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
  if (!m) continue;
  currentKey = m[1]!;
  let value = (m[2] ?? '').trim();
  if (value.startsWith('"""')) {
    inTriple = true;
    value = value.slice(3);
    if (value === '') continue;
    currentValue = [value];
    continue;
  } else if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  } else if (value.startsWith('#')) continue;
  env[currentKey] = value;
}

console.log('appId:', JSON.stringify(env.GITHUB_APP_ID));
console.log('key first 30:', env.GITHUB_PRIVATE_KEY?.slice(0, 30));
console.log('key last 30:', env.GITHUB_PRIVATE_KEY?.slice(-30));
console.log('key length:', env.GITHUB_PRIVATE_KEY?.length);
console.log('key has BEGIN:', env.GITHUB_PRIVATE_KEY?.includes('BEGIN'));
console.log('key has END:', env.GITHUB_PRIVATE_KEY?.includes('END'));
