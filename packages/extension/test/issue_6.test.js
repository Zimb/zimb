import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Issue #6: Debug bounty from VS Code (Zimb/zimb)
// The bounty body must include a Constraints section when constraints are provided.

const rendererPath = resolve(__dirname, '../packages/extension/src/chat/bountyRenderer.ts');
const source = readFileSync(rendererPath, 'utf8');

test('bountyRenderer includes Constraints section', () => {
  assert.ok(
    source.includes('## 🚧 Constraints'),
    'bountyRenderer.ts must render a Constraints section'
  );
});

test('bountyRenderer includes Constraints only when provided', () => {
  assert.ok(
    source.includes('if (issue.constraints.length > 0)'),
    'Constraints section should be conditional on issue.constraints'
  );
});

test('bountyRenderer includes Constraints footer note', () => {
  assert.ok(
    source.includes('Hard requirements. The fix MUST respect these'),
    'Constraints section must include the footer note'
  );
});
