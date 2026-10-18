// Each Lab scenario runs to the end and does what its card promises.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../../src/sim/engine.js';
import { NAME_INDEX } from '../../src/sim/genes.js';

function end(scenario, seed = 'eve') {
  const e = new Engine({ seed, scenario });
  while (!e.done) e.run(1);
  const h = e.history.at(-1);
  const kept = new Set(e.genome().kept);
  return { h, e, kept };
}

test('without a merger the archaea stay small and simple', () => {
  const { h } = end('alone');
  assert.equal(h.share, 0);
  assert.ok(h.V < 1, `volume ${h.V} µm³`);
  assert.ok(h.gh < 5000, `${h.gh} host genes`);
  assert.ok(h.mods.every((m) => m < 0.5));
});

test('without protein import the guests keep hundreds of genes and the cell stays small', () => {
  const { h } = end('noImport');
  assert.ok(h.gs >= 300, `${h.gs} guest genes`);
  assert.ok(h.atpShare < 0.1);
  assert.ok(h.V < 100, `volume ${h.V} µm³`);
});

test('without the ATP carrier the host never gets big', () => {
  const { h } = end('noAAC');
  assert.ok(h.atpShare < 0.1);
  assert.ok(h.V < 100, `volume ${h.V} µm³`);
  assert.ok(h.perGeneRel < 100, `power per gene ×${h.perGeneRel}`);
});

test('without local control the oily genes still stay', () => {
  const { h, kept } = end('noCoRR');
  assert.ok(h.gs > 0 && h.gs < 200, `${h.gs} guest genes`);
  assert.ok(kept.has(NAME_INDEX.cox1));
  assert.ok(h.V > 1000);
});

test('when anything can be imported the guest genome disappears', () => {
  const { h } = end('anything');
  assert.equal(h.gs, 0);
  assert.ok(h.ns > 0, 'the guests stay, without a genome');
});
