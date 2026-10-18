// The Validation tab: run the default to the end, plus two what-if runs,
// and set the results beside what is known from real cells. The same
// checks run in the headless long-run test.
//
// Each check says how the model gets there. "Emerges": nothing in the
// model aims at this number. "Tuned": constants were chosen so it lands
// near the real value. "Built in": a rule of the model makes it happen,
// and the check shows the rule plays out as meant.

import { Engine } from '../sim/engine.js';
import { K } from '../sim/params.js';
import { GENES, NAME_INDEX, PROTEIN_GENES } from '../sim/genes.js';

export const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

const RUNS = ['real', 'alone', 'noImport'];

export async function runValidation(onProgress, { seed = 'eve' } = {}) {
  const total = RUNS.length * K.steps;
  const out = {};
  let t = Date.now();
  for (let r = 0; r < RUNS.length; r++) {
    const e = new Engine({ seed, scenario: RUNS[r] });
    while (!e.done) {
      e.run(1);
      if (Date.now() - t > 40) {
        if (onProgress) onProgress({ step: r * K.steps + e.step, total });
        await breathe();
        t = Date.now();
      }
    }
    out[RUNS[r]] = { last: e.history[e.history.length - 1], genome: e.genome() };
  }
  return evaluate(out.real, { alone: out.alone.last, noImport: out.noImport.last });
}

const int = (x) => Math.round(x).toLocaleString('en-US');
const two = (x) => Number(x.toPrecision(2)).toLocaleString('en-US');
const across = (v) => Math.cbrt((6 * v) / Math.PI);
const days = (d) => (d >= 1 ? `${two(d)} days` : `${two(d * 24)} hours`);

// Mean number of membrane-spanning helices of the protein genes in a list.
function helices(list) {
  const prot = list.filter((g) => GENES[g].prot);
  return prot.reduce((s, g) => s + GENES[g].tm, 0) / Math.max(1, prot.length);
}

// `main`: the end of the default run ({last, genome}). `what`: the ends of
// the what-if runs, when they were run; without them only the checks on
// the run itself are made.
export function evaluate(main, what = null) {
  const h = main.last;
  const g = main.genome;
  const kept = new Set(g.kept);
  const tmKept = helices(g.kept);
  const tmMoved = helices(g.moved);
  const protShare = h.gsProt / PROTEIN_GENES;
  const mitoShare = (h.ns * K.symV) / h.V;
  const checks = [];

  if (what) {
    const a = what.alone;
    const d = across(a.V);
    checks.push({
      id: 'asgard',
      how: 'tuned',
      what: 'An archaeon on its own: its size and how fast it divides',
      model: `${two(d)} µm across, divides every ${days(a.doubling)}`,
      real: 'The Asgard archaeon grown by Imachi and colleagues: 0.3 to 0.75 µm across, divides every 14 to 25 days',
      pass: d >= 0.3 && d <= 0.75 && a.doubling >= 14 && a.doubling <= 25,
      source: 'Imachi et al. 2020',
    });
    const built = a.mods.filter((x) => x >= 0.999).length;
    checks.push({
      id: 'alone',
      how: 'emerges',
      what: 'Without the merger, archaea stay small and simple',
      model: `after ${int(K.steps * K.G)} generations: ${int(a.gh)} genes, ${two(a.V)} µm³, ${built ? `${built} eukaryotic features` : 'no eukaryotic feature complete'}`,
      real: 'No archaeon or bacterium has a nucleus, an inner membrane system and phagocytosis; Asgard archaea carry only some of the genes for them',
      pass: built === 0 && a.gh < 5000 && a.V < 1,
      source: 'Imachi et al. 2020; Lane & Martin 2010',
    });
  }

  checks.push({
    id: 'once',
    how: 'emerges',
    what: 'One merger founds every cell at the end',
    model: `${int(h.captures)} archaea took a partner inside; at the end every cell descends from ${h.lines === 1 ? 'one of them' : `${h.lines} of them`}`,
    real: 'All mitochondria descend from one alphaproteobacterium',
    pass: h.lines === 1,
    source: 'Roger, Muñoz-Gómez & Kamikawa 2017',
  });

  checks.push({
    id: 'mtGenes',
    how: 'emerges',
    what: 'Genes left in the guest genome at the end',
    model: `${int(h.gs)} genes, ${int(h.gsProt)} of them for proteins: ${two(protShare * 100)} % of the ${int(PROTEIN_GENES)} protein genes it started with`,
    real: '37 in humans (13 for proteins) up to 100 in the protist Andalucia (66 for proteins); free-living relatives have thousands',
    pass: h.gs >= 5 && h.gs <= 110 && protShare >= 0.002 && protShare <= 0.03,
    source: 'Anderson et al. 1981; Burger et al. 2013',
  });

  const coreKept = ['cox1', 'cob'].filter((n) => kept.has(NAME_INDEX[n]));
  checks.push({
    id: 'which',
    how: 'built',
    what: 'The genes that stay are the oily core of the respiratory chain',
    model: `${coreKept.length === 2 ? 'cox1 and cob kept' : coreKept.length ? `only ${coreKept[0]} kept` : 'cox1 and cob lost'}; kept proteins have ${two(tmKept)} helices in the membrane on average, moved ones ${two(tmMoved)}`,
    real: 'cox1 and cob stay in almost every mitochondrial genome; the proteins mitochondria still make are the most membrane-bound subunits',
    pass: coreKept.length === 2 && tmKept > 2 * tmMoved,
    source: 'Björkholm et al. 2015; Johnston & Williams 2016',
  });

  if (what) {
    const n = what.noImport.gs;
    checks.push({
      id: 'noImport',
      how: 'built',
      what: 'Without protein import, the guest genome stops shrinking much sooner',
      model: `${int(n)} genes left, ${two(n / Math.max(1, h.gs))} times as many as with import`,
      real: 'Insect endosymbionts, whose hosts send in few proteins, keep about 120 to 650 genes; mitochondria keep a handful to 100',
      pass: n >= 300 && n >= 5 * h.gs,
      source: 'McCutcheon & Moran 2012',
    });
  }

  checks.push({
    id: 'host',
    how: 'tuned',
    what: 'Genes in the host genome at the end',
    model: `${int(h.gh)} genes, ${two(h.gh / 3600)} times the archaeon’s`,
    real: 'Free-living protists have 6,000 to 40,000 genes (yeast about 6,000, Naegleria about 16,000); Asgard archaea about 4,000 to 5,000',
    pass: h.gh >= 6000 && h.gh <= 40000,
    source: 'Goffeau et al. 1996; Fritz-Laylin et al. 2010; Spang et al. 2015',
  });

  const big = h.V / K.bactV;
  checks.push({
    id: 'size',
    how: 'tuned',
    what: 'How big the cells grow, compared with a bacterium',
    model: `${two(h.V)} µm³, ${two(across(h.V))} µm across: ${two(big)} times the bacterium`,
    real: 'An average protist has about 15,000 times the mass of an average bacterium (accept 1,500 to 150,000)',
    pass: big >= 1500 && big <= 150000,
    source: 'Lane & Martin 2010',
  });

  checks.push({
    id: 'perGene',
    how: 'emerges',
    what: 'Power per gene, compared with a bacterium',
    model: `${two(h.perGeneRel)} times as much`,
    real: 'Four to five orders of magnitude more: 10,000 to 100,000 times as much (accept 3,000 to 300,000)',
    pass: h.perGeneRel >= 3000 && h.perGeneRel <= 300000,
    source: 'Lane & Martin 2010',
    note: 'Nothing aims at this number, but it rests on the cell size and genome size, which were tuned.',
  });

  checks.push({
    id: 'mitoShare',
    how: 'tuned',
    what: 'Share of the cell taken up by mitochondria',
    model: `${two(mitoShare * 100)} %`,
    real: 'From about 8 % of a white blood cell to 22 % of a liver cell and nearly half of a heart muscle cell (accept 5 to 50 %)',
    pass: mitoShare >= 0.05 && mitoShare <= 0.5,
    source: 'Weibel et al. 1969; David 1977',
  });

  return { checks, passed: checks.filter((c) => c.pass).length, total: checks.length };
}
