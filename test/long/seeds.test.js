// Other seeds take other paths but reach the same kind of cell, and a
// seeded run repeats exactly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../../src/sim/engine.js';
import { NAME_INDEX } from '../../src/sim/genes.js';

test('another seed also ends with mitochondria', () => {
  const e = new Engine({ seed: '2718' });
  while (!e.done) e.run(1);
  const h = e.history.at(-1);
  const kept = new Set(e.genome().kept);
  assert.ok(h.gs >= 5 && h.gs <= 110, `${h.gs} guest genes`);
  assert.ok(kept.has(NAME_INDEX.cox1) && kept.has(NAME_INDEX.cob));
  assert.ok(h.gh > 6000, `${h.gh} host genes`);
  assert.ok(h.V > 1000, `volume ${h.V} µm³`);
});

test('the first steps of a seeded run repeat exactly', () => {
  const a = new Engine({ seed: 'abc', scenario: 'noCoRR' });
  const b = new Engine({ seed: 'abc', scenario: 'noCoRR' });
  a.run(600);
  b.run(600);
  assert.deepEqual(a.history, b.history);
  assert.deepEqual(a.log, b.log);
});
