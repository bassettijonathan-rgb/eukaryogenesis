// The default run and the two what-ifs, scored against real cells: the
// same checks as the Validation tab. Every check must match, and the run
// must reproduce, number for number, the results stored with the built
// page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runValidation } from '../../src/app/validation.js';

test('the default run matches real cells', async () => {
  const result = await runValidation(null);
  for (const c of result.checks) {
    console.log(`${c.pass ? 'match' : 'miss '} ${c.id.padEnd(10)} model: ${c.model} | real: ${c.real}`);
    assert.ok(c.pass, `${c.id}: ${c.what}: model ${c.model}, real ${c.real}`);
  }
  const saved = JSON.parse(await readFile(new URL('../../dist/validation.json', import.meta.url), 'utf8'));
  assert.deepEqual(result, saved, 'dist/validation.json is out of date: run npm run build');
});
