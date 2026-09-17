/**
 * directivesParser.ts — parses `@zimb /issue <description> --flag value ...`
 *
 * Supported directives:
 *   -l / --lang        : en | fr | es | de (default: en)
 *   -u / --urgency     : low | medium | high | critical (default: medium)
 *   -b / --bounty      : number in major currency units (default: 30)
 *   -c / --currency    : EUR | USD | AUD | GBP (default: EUR)
 *
 * The remaining text (without the flags) becomes the "description" that the
 * LLM will structure into the bounty body.
 *
 * The directives are also embedded as YAML front-matter in the issue body
 * (`<!-- zimb: directives\nkey: value\n... -->`) so the @zimb-bot can re-read
 * them at claim time without having to parse the human-readable description.
 */
export interface ZimbDirectives {
  lang: 'en' | 'fr' | 'es' | 'de';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  bounty: number;
  currency: 'EUR' | 'USD' | 'AUD' | 'GBP';
  rawFlags: Record<string, string>;
}

const VALID_LANGS = ['en', 'fr', 'es', 'de'] as const;
const VALID_URGENCY = ['low', 'medium', 'high', 'critical'] as const;
const VALID_CURRENCY = ['EUR', 'USD', 'AUD', 'GBP'] as const;

const DEFAULT_DIRECTIVES: ZimbDirectives = {
  lang: 'en',
  urgency: 'medium',
  bounty: 30,
  currency: 'EUR',
  rawFlags: {},
};

/**
 * Split a raw `@zimb /issue <prompt>` into:
 *   - the free-form description (what the LLM should structure)
 *   - the parsed directives
 *
 * Flags can appear anywhere in the prompt (start, middle, end).
 * Quoted values are supported (single or double quotes).
 */
export function parseDirectives(rawPrompt: string): { description: string; directives: ZimbDirectives } {
  // Tokenize respecting double-quoted strings only. Single-quote/apostrophe
  // is treated as a regular character so "J'ai" stays whole.
  const tokens = rawPrompt.match(/(?:"[^"]*"|[^\s"])+/g) ?? [];

  const descriptionTokens: string[] = [];
  const rawFlags: Record<string, string> = {};

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    const normalized = tok.replace(/^"|"$/g, '');
    if (normalized.startsWith('-') && !normalized.startsWith('--')) {
      // Short flag (potentially combined like "-lu high")
      const chars = normalized.slice(1);
      for (let k = 0; k < chars.length; k++) {
        const key = chars[k]!;
        const longKey = shortToLong(key);
        if (!longKey) continue;
        const next = tokens[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          rawFlags[longKey] = next.replace(/^"|"$/g, '');
          // Increment the loop index by an EXTRA 1 (consumed the value token),
          // but only AFTER processing the last short char.
          if (k === chars.length - 1) i++;
        } else {
          rawFlags[longKey] = 'true';
        }
      }
    } else if (normalized.startsWith('--')) {
      const key = normalized.slice(2);
      if (!key) continue;
      const next = tokens[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        rawFlags[key] = next.replace(/^"|"$/g, '');
        i++; // consumed the value token (the for's i++ will add 1 more)
      } else {
        rawFlags[key] = 'true';
      }
    } else {
      descriptionTokens.push(tok);
    }
  }

  const description = descriptionTokens.join(' ').trim();

  const directives: ZimbDirectives = {
    ...DEFAULT_DIRECTIVES,
    rawFlags,
  };

  // Resolve lang
  const langRaw = (rawFlags.lang ?? '').toLowerCase();
  if ((VALID_LANGS as readonly string[]).includes(langRaw)) {
    directives.lang = langRaw as ZimbDirectives['lang'];
  }

  // Resolve urgency
  const urgencyRaw = (rawFlags.urgency ?? '').toLowerCase();
  if ((VALID_URGENCY as readonly string[]).includes(urgencyRaw)) {
    directives.urgency = urgencyRaw as ZimbDirectives['urgency'];
  }

  // Resolve currency
  const currencyRaw = (rawFlags.currency ?? '').toUpperCase();
  if ((VALID_CURRENCY as readonly string[]).includes(currencyRaw)) {
    directives.currency = currencyRaw as ZimbDirectives['currency'];
  }

  // Resolve bounty (must be a positive integer)
  const bountyRaw = rawFlags.bounty ?? '';
  if (bountyRaw) {
    const parsed = parseInt(bountyRaw, 10);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 5000) {
      directives.bounty = parsed;
    }
  }

  return { description, directives };
}

function shortToLong(short: string): string | null {
  switch (short) {
    case 'l':
      return 'lang';
    case 'u':
      return 'urgency';
    case 'b':
      return 'bounty';
    case 'c':
      return 'currency';
    default:
      return null;
  }
}

/**
 * Render the directives as an HTML comment block that GitHub will hide
 * in the rendered issue view but is still present in the raw markdown.
 * The @zimb-bot parses this at claim time.
 */
export function renderDirectivesFrontMatter(directives: ZimbDirectives): string {
  const lines = ['<!-- zimb: directives', '  lang: ' + directives.lang, '  urgency: ' + directives.urgency, '  bounty: ' + directives.bounty, '  currency: ' + directives.currency, '-->'];
  return lines.join('\n');
}

/**
 * Parse the directives back out of an issue body (used by @zimb-bot at claim
 * time to know which currency / language / bounty amount to use).
 */
export function parseDirectivesFromBody(body: string): ZimbDirectives {
  const match = /<!-- zimb: directives\n([\s\S]*?)-->/.exec(body);
  if (!match || !match[1]) return { ...DEFAULT_DIRECTIVES, rawFlags: {} };
  const flags: Record<string, string> = {};
  for (const rawLine of match[1].split('\n')) {
    // Accept optional leading whitespace before the key.
    const kv = /^\s*(\w+):\s*(.+?)\s*$/.exec(rawLine);
    if (kv && kv[1] && kv[2]) flags[kv[1]] = kv[2];
  }
  // Re-use the parser on a synthetic command line
  const tokens = Object.entries(flags).flatMap(([k, v]) => [`--${k}`, v]);
  const { directives } = parseDirectives(tokens.join(' '));
  return directives;
}
