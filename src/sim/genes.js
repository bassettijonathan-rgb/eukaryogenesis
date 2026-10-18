// The genes in the model.
//
// The guest starts as a free-living alphaproteobacterium with 3,000
// protein-coding genes and 33 RNA genes. Each gene has a kind, whether the
// guest needs it once it lives inside a host, how easily a copy made by the
// host can get its protein back into the guest, and whether it codes for a
// core subunit of the respiratory chain that the guest controls locally.
// The 100 named genes are the ones found in the most gene-rich mitochondrial
// genomes known, those of the jakobids Andalucia and Reclinomonas (Burger et
// al. 2013); the rest stand for whole groups.
//
// The host starts as an Asgard archaeon with about 4,000 genes: 3,600 it
// cannot do without and a few hundred recent duplicates that come and go.
// New host genes either build one of seven eukaryotic modules or join a pool
// of other new genes (regulation, signalling, new enzymes).

import { Rng } from './rng.js';
import { dexp } from './dmath.js';

// Kinds of guest gene. need: 0 not needed inside a host, 1 needed, 2 needed
// only while the guest still makes some protein of its own (the genetic
// system that expresses its genes, and the machinery that inserts them).
export const KINDS = [
  { key: 'outside', label: 'Living outside', need: 0, about: 'Swimming, sensing, a cell wall, pumps for food from the water, defences: useless inside another cell.' },
  { key: 'supply', label: 'Made by the host', need: 0, about: 'Building blocks such as amino acids and vitamins that the host can hand over.' },
  { key: 'metab', label: 'Metabolism', need: 1, about: 'The Krebs cycle, iron–sulfur clusters, fats: still needed inside.' },
  { key: 'genetic', label: 'Genetic system', need: 2, about: 'Ribosomes, RNA polymerase, enzymes that copy DNA: needed only to make the guest’s own proteins.' },
  { key: 'resp', label: 'Respiration', need: 1, about: 'The respiratory chain and ATP synthase, which make the ATP.' },
  { key: 'membrane', label: 'Membranes', need: 2, about: 'Inserting proteins into the guest’s membranes, making its lipids.' },
  { key: 'rna', label: 'RNA genes', need: 2, about: 'Ribosomal and transfer RNAs for the guest’s own ribosomes.' },
];
export const KIND = Object.fromEntries(KINDS.map((k, i) => [k.key, i]));

// Named genes: [name, kind, transmembrane helices, redox core]
const NAMED = [
  // complex I
  ['nad1', 'resp', 8, 1], ['nad2', 'resp', 11, 1], ['nad3', 'resp', 3, 1], ['nad4', 'resp', 14, 1],
  ['nad4L', 'resp', 3, 1], ['nad5', 'resp', 16, 1], ['nad6', 'resp', 5, 1], ['nad7', 'resp', 0, 0],
  ['nad8', 'resp', 0, 0], ['nad9', 'resp', 0, 0], ['nad10', 'resp', 0, 0], ['nad11', 'resp', 0, 0],
  // complex II
  ['sdh2', 'resp', 0, 0], ['sdh3', 'resp', 3, 0], ['sdh4', 'resp', 3, 0],
  // complex III
  ['cob', 'resp', 8, 1],
  // complex IV
  ['cox1', 'resp', 12, 1], ['cox2', 'resp', 2, 1], ['cox3', 'resp', 7, 1], ['cox11', 'resp', 1, 0], ['cox15', 'resp', 8, 0],
  // ATP synthase
  ['atp1', 'resp', 0, 0], ['atp3', 'resp', 0, 0], ['atp4', 'resp', 1, 0], ['atp6', 'resp', 5, 0], ['atp8', 'resp', 1, 0], ['atp9', 'resp', 2, 0],
  // cytochrome c maturation
  ['ccmA', 'resp', 0, 0], ['ccmB', 'resp', 6, 0], ['ccmC', 'resp', 6, 0], ['ccmF', 'resp', 13, 0],
  // ribosomal proteins
  ['rps1', 'genetic', 0, 0], ['rps2', 'genetic', 0, 0], ['rps3', 'genetic', 0, 0], ['rps4', 'genetic', 0, 0],
  ['rps7', 'genetic', 0, 0], ['rps8', 'genetic', 0, 0], ['rps10', 'genetic', 0, 0], ['rps11', 'genetic', 0, 0],
  ['rps12', 'genetic', 0, 0], ['rps13', 'genetic', 0, 0], ['rps14', 'genetic', 0, 0], ['rps19', 'genetic', 0, 0],
  ['rpl1', 'genetic', 0, 0], ['rpl2', 'genetic', 0, 0], ['rpl5', 'genetic', 0, 0], ['rpl6', 'genetic', 0, 0],
  ['rpl10', 'genetic', 0, 0], ['rpl11', 'genetic', 0, 0], ['rpl14', 'genetic', 0, 0], ['rpl16', 'genetic', 0, 0],
  ['rpl18', 'genetic', 0, 0], ['rpl19', 'genetic', 0, 0], ['rpl20', 'genetic', 0, 0], ['rpl27', 'genetic', 0, 0],
  ['rpl31', 'genetic', 0, 0], ['rpl32', 'genetic', 0, 0], ['rpl34', 'genetic', 0, 0], ['rpl35', 'genetic', 0, 0],
  // RNA polymerase and translation
  ['rpoA', 'genetic', 0, 0], ['rpoB', 'genetic', 0, 0], ['rpoC', 'genetic', 0, 0], ['rpoD', 'genetic', 0, 0], ['tufA', 'genetic', 0, 0],
  // protein insertion
  ['secY', 'membrane', 10, 0], ['tatA', 'membrane', 1, 0], ['tatC', 'membrane', 6, 0],
];
const TRNA = ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L1', 'L2', 'M1', 'M2', 'Mf', 'N', 'P', 'Q', 'R1', 'R2', 'S1', 'S2', 'T', 'V', 'W', 'Y', 'Ile2', 'Gly2', 'Pro2'];
const RNA_NAMED = ['rns', 'rnl', 'rrn5', ...TRNA.map((t) => `trn${t}`), 'rnpB', 'ssrA'];

// Bulk genes in each kind, so that there are 3,000 protein genes in all
const BULK = { outside: 2073, supply: 350, metab: 250, genetic: 130, resp: 50, membrane: 80 };

// How easily a host-made copy of the protein reaches the guest, relative to
// a soluble protein: each helix that must cross or sit in a membrane makes
// import harder (von Heijne 1986; Björkholm et al. 2015).
export const importability = (tm) => dexp(-0.55 * tm);

function buildCatalog() {
  const genes = [];
  for (const [name, kind, tm, corr] of NAMED) genes.push({ name, kind: KIND[kind], tm, corr, prot: 1, op: name.replace(/[0-9A-Z]+$/, '') });
  for (const name of RNA_NAMED) genes.push({ name, kind: KIND.rna, tm: 0, corr: 0, prot: 0, op: name.startsWith('trn') ? 'trn' : 'rrn' });
  const rng = new Rng('alphaproteobacterium');
  for (const [key, count] of Object.entries(BULK)) {
    for (let i = 0; i < count; i++) {
      // membrane-bound bulk genes have a few helices; respiration assembly
      // factors are partly membrane-bound
      let tm = 0;
      if (key === 'membrane') tm = rng.int(7);
      else if (key === 'resp') tm = rng.chance(0.4) ? 1 + rng.int(4) : 0;
      genes.push({ name: null, kind: KIND[key], tm, corr: 0, prot: 1, op: null });
    }
  }
  return genes;
}

export const GENES = buildCatalog();
export const NG = GENES.length; // 3,033
export const WORDS = Math.ceil(NG / 32);

export const G_KIND = Uint8Array.from(GENES, (g) => g.kind);
export const G_PROT = Uint8Array.from(GENES, (g) => g.prot);
export const G_CORR = Uint8Array.from(GENES, (g) => g.corr);
export const G_NEED = Uint8Array.from(GENES, (g) => KINDS[g.kind].need);
// rRNA cannot be imported; tRNA import is rare (it happens in some lineages)
export const G_IMP = Float64Array.from(GENES, (g) => {
  if (!g.prot) return g.name.startsWith('trn') ? 0.01 : 0;
  if (KINDS[g.kind].need === 0) return 0;
  return importability(g.tm);
});
export const NAME_INDEX = Object.fromEntries(GENES.filter((g) => g.name).map((g) => [g.name, GENES.indexOf(g)]));
export const PROTEIN_GENES = GENES.filter((g) => g.prot).length;
export const KIND_COUNT = KINDS.map((k, i) => GENES.filter((g) => g.kind === i).length);

// The order of genes on the guest chromosome. Bacteria keep genes of one
// machine together in operons (ribosomal proteins, complex I, ATP synthase),
// and genes for life outside a host often sit in long islands (a flagellum,
// a secretion system, a set of sensors). Deletions remove runs of
// neighbouring genes, so a run inside an island of useless genes can go in
// one step, while useless genes stuck between needed ones go only bit by bit.
const ISLAND = { outside: 30, supply: 10, metab: 4, genetic: 3, resp: 3, membrane: 3, rna: 2 };

function buildOrder() {
  const rng = new Rng('chromosome');
  const units = [];
  const byOp = new Map();
  const loose = new Map();
  GENES.forEach((g, i) => {
    if (g.op && g.op !== 'trn') {
      if (!byOp.has(g.op)) {
        byOp.set(g.op, []);
        units.push(byOp.get(g.op));
      }
      byOp.get(g.op).push(i);
    } else {
      const key = KINDS[g.kind].key;
      if (!loose.has(key)) loose.set(key, []);
      loose.get(key).push(i);
    }
  });
  for (const [key, list] of loose) {
    let i = 0;
    while (i < list.length) {
      const len = rng.geometric(ISLAND[key]);
      units.push(list.slice(i, i + len));
      i += len;
    }
  }
  for (let i = units.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [units[i], units[j]] = [units[j], units[i]];
  }
  return Uint16Array.from(units.flat());
}
export const ORDER = buildOrder();
export const POS = (() => {
  const p = new Uint16Array(NG);
  ORDER.forEach((g, i) => (p[g] = i));
  return p;
})();

// The order in which the picture draws the guest genome: grouped by kind.
export const DISPLAY = Uint16Array.from(
  GENES.map((g, i) => i).sort((a, b) => GENES[a].kind - GENES[b].kind || (GENES[b].name ? 1 : 0) - (GENES[a].name ? 1 : 0) || a - b),
);

// ---- the host

export const HOST_GENES = 3600;
// Archaeal genes that a bacterial gene from the guest can take over
// (lipid synthesis, much of metabolism): eukaryotes make bacterial-type
// membrane lipids, for instance.
export const HOST_REPLACEABLE = 600;

// Eukaryotic modules: how many genes each needs, how often a cell gains a
// new gene for it (per cell per step), and what it does. Each gene in a
// module adds its share of the module's effect.
export const MODULES = [
  { key: 'import', label: 'Protein import', size: 30, rate: 3e-4, about: 'Gates in the guest’s membranes (TOM and TIM) that let proteins made by the host into the guest.' },
  { key: 'aac', label: 'ATP export', size: 6, rate: 2e-5, about: 'The ADP/ATP carrier, a host invention placed in the guest’s inner membrane: it swaps the host’s ADP for the guest’s ATP.' },
  { key: 'nucleus', label: 'Nucleus', size: 80, rate: 0.03, about: 'An envelope with pores around the host’s DNA, plus the spliceosome: genes are read and their introns cut out before any ribosome sees the message.' },
  { key: 'endo', label: 'Inner membranes', size: 120, rate: 0.15, about: 'The endoplasmic reticulum, Golgi and vesicles: membranes inside the cell for making, sorting and taking things in.' },
  { key: 'cyto', label: 'Cytoskeleton', size: 100, rate: 0.12, about: 'Actin, tubulin and motor proteins that hold a big cell in shape, move it and carry cargo across it.' },
  { key: 'phago', label: 'Phagocytosis', size: 80, rate: 0.06, about: 'Wrapping the membrane around other cells to eat them whole. Needs inner membranes and a cytoskeleton.' },
  { key: 'sex', label: 'Sex', size: 60, rate: 0.03, about: 'Meiosis and cell fusion: shuffling genomes, so a big genome does not pile up broken genes.' },
];
export const MOD = Object.fromEntries(MODULES.map((m, i) => [m.key, i]));
export const NMOD = MODULES.length;
export const MODULE_GENES = MODULES.reduce((s, m) => s + m.size, 0);
