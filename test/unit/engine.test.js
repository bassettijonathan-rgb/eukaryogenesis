import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, budget, bacteriumBudget } from '../../src/sim/engine.js';
import { DEFAULTS, SCENARIOS, K } from '../../src/sim/params.js';
import { GENES, NG, DISPLAY, MODULES, HOST_GENES } from '../../src/sim/genes.js';

const run = (opts, steps) => {
  const e = new Engine(opts);
  e.run(steps);
  return e;
};
const fingerprint = (e) => JSON.stringify(e.history.map((h) => [h.step, h.share, h.gs, h.gh, h.V, h.mods, h.captures, h.transfers, h.lost]));
const across = (v) => Math.cbrt((6 * v) / Math.PI);

test('the same seed gives the same run', () => {
  const a = run({ seed: 'eve' }, 150);
  const b = run({ seed: 'eve' }, 150);
  assert.equal(fingerprint(a), fingerprint(b));
  const c = run({ seed: '42', scenario: 'noImport' }, 100);
  const d = run({ seed: '42', scenario: 'noImport' }, 100);
  assert.equal(fingerprint(c), fingerprint(d));
  const other = run({ seed: '43', scenario: 'noImport' }, 100);
  assert.notEqual(fingerprint(c), fingerprint(other));
});

test('a run is the same whether it goes in one go or in pieces', () => {
  const a = run({ seed: '7' }, 90);
  const b = new Engine({ seed: '7' });
  for (let i = 0; i < 9; i++) b.run(10);
  assert.equal(fingerprint(a), fingerprint(b));
});

test('the run starts with Imachi’s archaeon, and the bacterium is the yardstick', () => {
  const e = new Engine({ seed: 'eve' });
  const h = e.history[0];
  assert.equal(h.ns, 0);
  assert.ok(h.doubling >= 14 && h.doubling <= 25, `archaeon doubles every ${h.doubling} days`);
  assert.ok(across(h.V) >= 0.3 && across(h.V) <= 0.75, `archaeon ${across(h.V)} µm across`);
  assert.ok(h.gh >= HOST_GENES && h.gh < HOST_GENES + 100);
  assert.ok(h.perGeneRel > 0.001 && h.perGeneRel < 0.05, `archaeon power per gene ×${h.perGeneRel}`);
  const bac = bacteriumBudget(e.params);
  assert.equal(bac.genes, NG);
  assert.ok(bac.power > 0 && bac.perGene > 0);
});

test('the energy budget adds up and stays finite', () => {
  const e = run({ seed: 'eve' }, 120);
  for (const h of e.history) {
    for (const k of ['share', 'gs', 'gh', 'V', 'power', 'hostPower', 'food', 'ferm', 'resp', 'upkeepHost', 'perGeneRel', 'atpShare']) {
      assert.ok(Number.isFinite(h[k]), `${k} at step ${h.step}`);
    }
    assert.ok(h.share >= 0 && h.share <= 1);
    assert.ok(h.atpShare >= 0 && h.atpShare <= 1);
    assert.ok(h.gs >= 0 && h.gs <= NG);
    assert.ok(h.ferm + h.resp <= h.food * (1 + 1e-9), `ATP made beyond the food at step ${h.step}`);
    assert.ok(h.mods.every((m) => m >= 0 && m <= 1));
  }
  // budget() on its own, for a plain archaeon
  const c = { vc: K.archV, ns: 0, gs: 0, gsProt: 0, corrMiss: 0, arch: HOST_GENES, bact: 0, junk: 0, extra: 0, introns: 0, mod: new Uint16Array(MODULES.length) };
  const b = budget(c, { ...DEFAULTS });
  assert.ok(b.mu > 0 && b.power > 0 && b.genes === HOST_GENES);
});

test('the frame and geometry can cross to the page', () => {
  const e = run({ seed: 'eve' }, 70);
  const g = e.geometry();
  const f = e.frame();
  assert.equal(g.genes.length, NG);
  assert.equal(g.display.length, NG);
  assert.deepEqual([...g.display].sort((a, b) => a - b), Array.from({ length: NG }, (_, i) => i));
  assert.deepEqual([...DISPLAY].sort((a, b) => a - b), Array.from({ length: NG }, (_, i) => i));
  assert.equal(g.modules.length, MODULES.length);
  assert.ok(f.cells.length > 0 && f.cells.length <= 34);
  assert.equal(new Set(f.cells.map((c) => c.id)).size, f.cells.length);
  assert.ok(f.typical.sym.length * 32 >= NG && f.typical.nuc.length === f.typical.sym.length);
  // structured-cloneable: plain arrays and typed arrays only
  assert.doesNotThrow(() => structuredClone({ g, f }));
});

test('the genome of the typical cell splits into kept and moved genes', () => {
  const e = run({ seed: 'eve' }, 500);
  const g = e.genome();
  const kept = new Set(g.kept);
  assert.ok(g.kept.length > 0 && g.kept.length < NG);
  assert.ok(g.moved.length > 0);
  assert.ok(g.moved.every((i) => !kept.has(i)));
  const h = e.history.at(-1);
  assert.equal(g.kept.length, h.gs);
  assert.ok(GENES.length === NG);
});

test('Lab buttons change the cells and leave a note', () => {
  const e = run({ seed: 'eve', scenario: 'alone' }, 5);
  assert.equal(e.history.at(-1).share, 0);
  e.inject('capture');
  assert.ok(e.A.ns.some((n) => n > 0), 'a cell has guests');
  e.inject('spill');
  e.inject('aac');
  e.inject('cure');
  e.inject('nonsense');
  assert.equal(e.log.filter((n) => n.kind === 'lab').length, 4);
  e.setParams({ food: 1.5, notAParam: 3 });
  assert.equal(e.params.food, 1.5);
  assert.equal(e.params.notAParam, undefined);
  e.run(3);
  assert.equal(e.step, 8);
});

test('every scenario starts', () => {
  for (const key of Object.keys(SCENARIOS)) {
    const e = run({ seed: 'eve', scenario: key }, 3);
    assert.equal(e.scenario, key);
    assert.equal(e.history.length, 4);
  }
  assert.equal(new Engine({ scenario: 'nope' }).scenario, 'real');
});

test('a run ends after its last step', () => {
  const e = new Engine({ seed: 'eve' });
  e.step = K.steps - 2; // skip ahead: only the bookkeeping is under test
  e.run(10);
  assert.ok(e.done);
  assert.equal(e.step, K.steps);
});
