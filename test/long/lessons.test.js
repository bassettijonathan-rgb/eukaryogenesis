// The Learn chapters run the default to a step and tell the reader what to
// look at there. What they point at must have happened by then.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../../src/sim/engine.js';
import { CHAPTERS } from '../../src/app/guide.js';

test('each lesson stops after the moment it is about', () => {
  const e = new Engine({ seed: 'eve' });
  while (!e.done) e.run(1);
  for (const ch of CHAPTERS) {
    const after = ch.show.after;
    if (!after) continue;
    const at = ch.show.steps.at(-1).step;
    assert.ok(e.marks[after] !== undefined, `${ch.id}: "${after}" never happens`);
    assert.ok(e.marks[after] <= at, `${ch.id}: "${after}" happens at step ${e.marks[after]}, after the lesson stops at ${at}`);
  }
});
