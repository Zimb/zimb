/**
 * commandParser.ts — parses `@zimb-bot <verb> [--flag value ...]` commands
 * inside GitHub issue / PR comments.
 *
 * Examples:
 *   "@zimb-bot claim"                          → { verb: 'claim', flags: {}, raw: 'claim' }
 *   "@zimb-bot claim --bounty 200"             → { verb: 'claim', flags: { bounty: '200' }, raw: '...' }
 *   "@zimb-bot claim --bounty=\"200 EUR\""    → { verb: 'claim', flags: { bounty: '200 EUR' } }
 *   "@zimb-bot status"                          → { verb: 'status', flags: {}, raw: 'status' }
 *   "@zimb-bot help"                            → { verb: 'help',   flags: {}, raw: 'help'   }
 *
 * Rules:
 *   - Only the FIRST line of the comment triggers the parser.
 *   - Code blocks (```...```) are stripped before parsing (a mention inside
 *     a fenced code block should NOT trigger the bot).
 *   - Unknown verbs return null (caller stays silent).
 *   - Booleans: a flag with no value defaults to 'true'.
 */

export type ZimbVerb = 'claim' | 'unclaim' | 'status' | 'help' | 'dispute';

export interface ZimbCommand {
  verb: ZimbVerb;
  flags: Record<string, string>;
  raw: string;
}

const VALID_VERBS: ReadonlySet<string> = new Set<ZimbVerb>([
  'claim',
  'unclaim',
  'status',
  'help',
  'dispute',
]);

export function parseCommand(commentBody: string | null | undefined): ZimbCommand | null {
  if (!commentBody) return null;

  // Strip fenced code blocks first (their contents shouldn't trigger commands)
  const sanitized = commentBody.replace(/```[\s\S]*?```/g, '');

  // Find the first line starting with @zimb-bot (case-insensitive)
  const firstLine = sanitized
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^@zimb-bot\b/i.test(l));
  if (!firstLine) return null;

  // Strip the prefix
  const afterPrefix = firstLine.replace(/^@zimb-bot\s*/i, '').trim();
  if (!afterPrefix) return null;

  // Tokenize: respects quoted strings (single or double)
  const tokens = afterPrefix.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  if (tokens.length === 0) return null;

  const verb = tokens[0]!.toLowerCase();
  if (!VALID_VERBS.has(verb)) return null;

  const flags: Record<string, string> = {};
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (!tok.startsWith('--')) continue;
    const key = tok.slice(2);
    if (!key) continue;
    const next = tokens[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next.replace(/^["']|["']$/g, '');
      i++;
    } else {
      flags[key] = 'true';
    }
  }

  return { verb: verb as ZimbVerb, flags, raw: afterPrefix };
}
