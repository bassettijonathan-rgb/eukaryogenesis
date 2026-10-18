// The simulation. A population of host cells, each with its own genome and,
// once it has taken a partner inside, a crowd of guests that share one
// genome of their own. Each step stands for K.G generations: cells leave
// offspring in proportion to how fast their energy budget lets them grow
// (Wright–Fisher sampling), then the offspring mutate. Nothing about the
// outcome is scripted: guest genes are lost, copied into the host and
// replaced only when chance offers it and the energy budget favours it.

import { Rng } from './rng.js';
import { dexp, dlog, dcbrt, dpow, LN2 } from './dmath.js';
import { K, DEFAULTS, SCENARIOS } from './params.js';
import { NG, WORDS, GENES, G_KIND, G_PROT, G_CORR, G_NEED, G_IMP, ORDER, DISPLAY, KIND, KINDS, MODULES, NMOD, MOD, HOST_GENES, HOST_REPLACEABLE, PROTEIN_GENES } from './genes.js';

const W = WORDS;
const PI4 = 4 * Math.PI;

function popcnt(x) {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}

const has = (bits, base, g) => (bits[base + (g >>> 5)] >>> (g & 31)) & 1;
const set = (bits, base, g) => (bits[base + (g >>> 5)] |= 1 << (g & 31));
const clear = (bits, base, g) => (bits[base + (g >>> 5)] &= ~(1 << (g & 31)));

// All the cells of one generation, as columns.
class Pop {
  constructor(n) {
    this.vc = new Float64Array(n); // host cytoplasm, µm³
    this.gx = new Float64Array(n); // guests kept, relative to what the host's leftovers can feed
    this.ns = new Int32Array(n); // guests
    this.sym = new Uint32Array(n * W); // genes still in the guest genome
    this.nuc = new Uint32Array(n * W); // guest genes with a working copy in the host genome
    this.gs = new Int32Array(n); // guest genes
    this.gsProt = new Int32Array(n); // of which protein-coding
    this.corrMiss = new Int32Array(n); // redox-core genes the guest no longer has
    this.arch = new Int32Array(n); // archaeal genes
    this.bact = new Int32Array(n); // working genes from the guest
    this.junk = new Int32Array(n); // broken copies of guest DNA
    this.mod = new Int32Array(n * NMOD); // genes in each module
    this.extra = new Int32Array(n); // other new genes
    this.introns = new Int32Array(n);
    this.line = new Int32Array(n); // which merger the cell descends from (0: none)
    this.id = new Int32Array(n); // follows one line of descent, for drawing
    this.from = new Int32Array(n); // index of the parent in the previous step
    this.mu = new Float64Array(n); // growth rate, per day
    this.pw = new Float64Array(n); // power, ATP per day
  }
}

const SCALARS = ['vc', 'gx', 'ns', 'gs', 'gsProt', 'corrMiss', 'arch', 'bact', 'junk', 'extra', 'introns', 'line', 'id', 'mu', 'pw'];

function copyCell(a, i, b, j) {
  for (const k of SCALARS) b[k][j] = a[k][i];
  b.sym.set(a.sym.subarray(i * W, i * W + W), j * W);
  b.nuc.set(a.nuc.subarray(i * W, i * W + W), j * W);
  b.mod.set(a.mod.subarray(i * NMOD, i * NMOD + NMOD), j * NMOD);
}

// Completeness of each module, 0 to 1, and how much of its effect the cell
// gets. Protein import and the ATP carrier only work in a cell with guests;
// phagocytosis needs inner membranes to wrap the prey and a cytoskeleton to
// move them.
export function moduleState(counts, P) {
  const lin = MODULES.map((m, k) => Math.min(1, counts[k] / m.size));
  const imp = P.importable ? lin[MOD.import] : 0;
  const prereq = Math.min(1, lin[MOD.endo] / 0.5) * Math.min(1, lin[MOD.cyto] / 0.5);
  return {
    lin,
    import: imp,
    // the carrier is made by the host and has to be imported into the guests
    aac: P.aac ? lin[MOD.aac] * imp : 0,
    nucleus: lin[MOD.nucleus],
    endo: lin[MOD.endo],
    cyto: lin[MOD.cyto],
    phago: P.phago ? lin[MOD.phago] * prereq : 0,
    sex: lin[MOD.sex],
  };
}

const SYM_GEXP = dpow(K.symV, K.gExp);
// powers of the respiration kept per missing redox-core gene, and of the
// chance a guest is missed at division
const powers = (x, n) => {
  const t = new Float64Array(n + 1);
  t[0] = 1;
  for (let k = 1; k <= n; k++) t[k] = t[k - 1] * x;
  return t;
};
const CORR_POW = powers(K.corrLoss, 64);
const LOSS_POW = powers(K.loss, 40);
const MOD_RATE = MODULES.reduce((s, m) => s + m.rate, 0);

function sumMod(mod) {
  let s = 0;
  for (let k = 0; k < mod.length; k++) s += mod[k];
  return s;
}

// Food a cell takes in, in ATP a day if fully burnt: through its surface,
// through inner membranes, and by eating other cells whole.
export function intake(c, P, fx, S) {
  const vc = c.vc;
  // inner membranes and a cytoskeleton help only a cell big enough to hold them
  const roomy = vc / (vc + K.vHalf);
  const boost = P.food * (1 + K.extraB * dlog(1 + c.extra / K.extraN)) * (1 + K.cytoB * fx.cyto * roomy);
  const surface = K.jS * S * boost;
  const endo = K.jE * vc * fx.endo * roomy * boost;
  // a bigger eater can catch a wider range of prey
  const phago = ((K.jP * vc * vc * fx.phago) / (vc + K.vPrey)) * (1 + K.preyRange * dlog(1 + vc / K.vPrey)) * boost;
  return { surface, endo, phago, food: surface + endo + phago };
}

// How many guests a host's leftovers can keep busy.
export function guestsFed(c, P) {
  const r = dcbrt((3 * c.vc) / PI4);
  const { food } = intake(c, P, moduleState(c.mod, P), PI4 * r * r);
  return ((1 - K.ef) * P.oxygen * food) / K.ps;
}

// How many guests a host keeps: about as many as its leftovers can keep
// busy, times its heritable setting gx, within the room it has.
export function guestCount(c, P, gx) {
  const room = Math.max(1, Math.floor((K.roomMax * c.vc) / K.symV));
  return Math.max(1, Math.min(room, Math.round(gx * guestsFed(c, P))));
}

// The energy budget of one cell. Returns growth per day and the parts that
// make it up, for the explanations.
//
// The host takes in food and ferments it, getting a tenth of its energy; the
// guests burn the leftovers. The host gets only the share of the guests' ATP
// its machinery lets it take. Two limits apply and the lower one wins: the
// host grows on its own ATP plus that share, and the whole cell, guests
// included, can never grow faster than all its ATP allows.
export function budget(c, P) {
  const ns = c.ns;
  const vc = c.vc;
  const V = vc + ns * K.symV;
  const r = dcbrt((3 * vc) / PI4);
  const S = PI4 * r * r;
  const fx = moduleState(c.mod, P);
  const genes = c.arch + c.bact + c.extra + sumMod(c.mod);
  const { surface, endo, phago, food } = intake(c, P, fx, S);
  // fermentation runs faster when partners mop up its waste (hydrogen) and
  // the oxygen that poisons it; guests inside help most
  const q = K.qOut + (ns > 0 ? (K.qIn * Math.min(ns, K.nq)) / K.nq : 0);
  const syn = K.syn0 + ((1 - K.syn0) * q) / (q + 1);
  const ferm = K.ef * food * syn;
  // respiration by the guests, as far as their numbers allow; each redox-core
  // gene they no longer encode themselves costs some control
  const leftover = (1 - K.ef) * P.oxygen * food;
  const ctrl = P.corr ? CORR_POW[Math.min(64, c.corrMiss)] : 1;
  const resp = ns > 0 ? ctrl * Math.min(leftover, ns * K.ps) : 0;
  const share = ns > 0 ? Math.min(K.xMax, K.x0 + K.xImport * fx.import + K.xAAC * fx.aac) : 0;
  // moving things across a big cell
  const vd = K.vd * (1 + K.cytoD * fx.cyto) * (1 + K.endoD * fx.endo);
  const transport = 1 / (1 + (V / vd) * (V / vd));
  // introns read without a nucleus spoil proteins; big genomes kept without
  // sex pile up broken genes
  const intron = Math.max(0.02, 1 - K.intronCost * c.introns * (1 - fx.nucleus));
  const load = Math.max(0.2, 1 - ((K.load * Math.max(0, genes - K.loadFree)) / 10000) * (1 - 0.9 * fx.sex));
  const eff = transport * intron * load;
  // a prokaryote that powers itself with its own membrane needs a genome copy
  // for each µm³ it controls; once the guests make the ATP, one is enough
  const copies = 1 + Math.max(0, vc / K.vctrl - 1) * (1 - fx.aac);
  const g = (genes + K.junk * c.junk) * P.geneCost;
  const upkeepGenes = K.mg * copies * g * dpow(vc, K.gExp);
  const upkeepHost = K.m * vc + upkeepGenes;
  const buildHost = K.b * vc + K.crep * copies * g;
  const upkeepSym = ns * (K.m * K.symV + K.mg * P.geneCost * c.gsProt * SYM_GEXP);
  const buildSym = ns * (K.b * K.symV + K.crep * P.geneCost * c.gs);
  const hostPower = (ferm + share * resp) * eff;
  const muHost = (LN2 * (hostPower - upkeepHost)) / buildHost;
  const muAll = ns > 0 ? (LN2 * ((ferm + resp) * eff - upkeepHost - upkeepSym)) / (buildHost + buildSym) : Infinity;
  const mu = Math.max(0, Math.min(muHost, muAll));
  return {
    V,
    S,
    r,
    food,
    surface,
    endo,
    phago,
    syn,
    ferm,
    leftover,
    resp,
    share,
    transport,
    intron,
    load,
    ctrl,
    copies,
    genes,
    power: ferm + resp, // the whole cell's metabolism, guests included
    hostPower,
    upkeepGenes,
    upkeepHost,
    buildHost,
    upkeepSym,
    buildSym,
    muHost,
    muAll,
    limit: ns > 0 && muAll < muHost ? 'all' : 'host',
    mu,
    fx,
  };
}

// The free-living alphaproteobacterium in the same pond: 1 µm³, respiring
// what it takes in through its surface, with the guest's full genome.
export function bacteriumBudget(P) {
  const V = K.bactV;
  const r = dcbrt((3 * V) / PI4);
  const S = PI4 * r * r;
  const food = P.food * K.jS * S;
  const power = (K.ef + (1 - K.ef) * P.oxygen) * food;
  const genes = NG;
  return { V, power, genes, perGene: power / genes };
}

export class Engine {
  constructor({ seed = 'eve', scenario = 'real', params = {} } = {}) {
    this.seed = String(seed);
    this.scenario = SCENARIOS[scenario] ? scenario : 'real';
    this.params = { ...DEFAULTS, ...SCENARIOS[this.scenario].params, ...params };
    this.rng = new Rng(`${this.seed}/${this.scenario}`);
    this.N = K.N;
    this.A = new Pop(this.N);
    this.B = new Pop(this.N);
    this.step = 0;
    this.history = [];
    this.log = [];
    this.marks = {};
    this.nextId = 1;
    this.lines = 0;
    this.captures = 0;
    this.lost = 0;
    this.transfers = 0;
    this.shown = [];
    this.events = []; // what happened this step, for the picture
    const a = this.A;
    for (let i = 0; i < this.N; i++) {
      a.vc[i] = K.archV;
      a.arch[i] = HOST_GENES;
      a.extra[i] = this.rng.poisson(K.startExtra);
      a.id[i] = this.nextId++;
      a.from[i] = i;
    }
    this.assessAll(a);
    this.record();
  }

  get done() {
    return this.step >= K.steps;
  }

  get generations() {
    return this.step * K.G;
  }

  setParams(patch) {
    for (const [k, v] of Object.entries(patch ?? {})) if (k in DEFAULTS) this.params[k] = v;
    this.assessAll(this.A);
    if (this.history.length) this.history[this.history.length - 1] = this.summary();
  }

  cellView(p, i) {
    return {
      vc: p.vc[i],
      ns: p.ns[i],
      gs: p.gs[i],
      gsProt: p.gsProt[i],
      corrMiss: p.corrMiss[i],
      arch: p.arch[i],
      bact: p.bact[i],
      junk: p.junk[i],
      extra: p.extra[i],
      introns: p.introns[i],
      mod: p.mod.subarray(i * NMOD, i * NMOD + NMOD),
    };
  }

  assessAll(p) {
    for (let i = 0; i < this.N; i++) {
      const b = budget(this.cellView(p, i), this.params);
      p.mu[i] = b.mu;
      p.pw[i] = b.power;
    }
  }

  run(n = 1) {
    for (let k = 0; k < n && !this.done; k++) this.advance();
  }

  advance() {
    const { rng, N } = this;
    const a = this.A;
    const b = this.B;
    this.events = [];
    // selection: offspring in proportion to growth over K.G generations
    let mean = 0;
    for (let i = 0; i < N; i++) mean += a.mu[i];
    mean /= N;
    const w = new Float64Array(N);
    let total = 0;
    for (let i = 0; i < N; i++) {
      const e = mean > 0 && a.mu[i] > 0 ? Math.max(-60, Math.min(60, (LN2 * K.G * (a.mu[i] - mean)) / mean)) : -60;
      w[i] = a.mu[i] > 0 || mean <= 0 ? dexp(e) : 0;
      total += w[i];
    }
    if (!(total > 0)) {
      for (let i = 0; i < N; i++) w[i] = 1;
      total = N;
    }
    const cum = new Float64Array(N);
    let s = 0;
    for (let i = 0; i < N; i++) {
      s += w[i];
      cum[i] = s;
    }
    const firstChild = new Int32Array(N).fill(-1);
    for (let j = 0; j < N; j++) {
      const u = rng.float() * total;
      let lo = 0;
      let hi = N - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] > u) hi = mid;
        else lo = mid + 1;
      }
      copyCell(a, lo, b, j);
      b.from[j] = lo;
      // one offspring carries on the parent's line of drawing; others are new
      if (firstChild[lo] < 0) firstChild[lo] = j;
      else b.id[j] = this.nextId++;
    }
    this.step++;
    for (let j = 0; j < N; j++) this.mutate(b, j);
    this.A = b;
    this.B = a;
    this.assessAll(b);
    this.record();
  }

  // ---------------------------------------------------------------- mutation

  mutate(p, i) {
    const { rng } = this;
    const P = this.params;
    // cell size and guest numbers drift a little each step
    if (rng.chance(K.uSize)) p.vc[i] = Math.min(K.maxV, Math.max(K.minV, p.vc[i] * dexp(K.sizeStep * rng.normal())));
    if (p.ns[i] > 0) {
      if (rng.chance(K.uShare)) p.gx[i] = Math.min(100, Math.max(0.02, p.gx[i] * dexp(K.shareStep * rng.normal())));
      const ns = guestCount(this.cellView(p, i), P, p.gx[i]);
      p.ns[i] = ns;
      // the guests are shared out at each division, and a daughter missed by
      // all of them has none; import machinery lets the host keep its guests
      // in step with its own division
      const imp = P.importable ? Math.min(1, p.mod[i * NMOD + MOD.import] / MODULES[MOD.import].size) : 0;
      if (ns <= 40 && rng.chance(LOSS_POW[ns] * (1 - 0.95 * imp))) {
        this.loseGuests(p, i);
      } else {
        const nDel = rng.poisson(K.uSymDel);
        for (let k = 0; k < nDel && p.gs[i] > 0; k++) this.symDeletion(p, i);
        const nT = rng.poisson((K.lambdaT * P.transfer * ns) / (ns + 3));
        for (let k = 0; k < nT && p.gs[i] > 0; k++) this.integrate(p, i);
      }
    } else if (P.capture) {
      // an archaeon with partners on its protrusions may take one inside
      const partners = rng.binomial(3, 1 / 3);
      if (partners > 0 && rng.chance(K.pCapture * partners)) this.capture(p, i);
    }
    const nDup = rng.poisson(K.uDup);
    for (let k = 0; k < nDup; k++) this.duplicate(p, i);
    const nMod = rng.poisson(MOD_RATE);
    for (let k = 0; k < nMod; k++) this.innovate(p, i);
    const nHD = rng.poisson(K.uHostDel);
    for (let k = 0; k < nHD; k++) this.hostDeletion(p, i);
    // introns copy themselves around the genome and are lost now and then
    const n = p.introns[i];
    if (n > 0) {
      const genes = p.arch[i] + p.bact[i] + p.extra[i] + sumMod(p.mod.subarray(i * NMOD, i * NMOD + NMOD));
      const room = Math.max(0, 1 - n / (K.intronMax * genes));
      p.introns[i] = Math.max(0, n + rng.poisson(n * K.intronSpread * room) - rng.binomial(n, K.intronLoss));
    }
  }

  capture(p, i) {
    const base = i * W;
    for (let k = 0; k < W; k++) p.sym[base + k] = 0;
    for (let g = 0; g < NG; g++) set(p.sym, base, g);
    // the protrusions close around the partner (Imachi et al. 2020), and it
    // divides once inside
    p.ns[i] = K.capturedGuests;
    p.gx[i] = K.capturedGuests / guestsFed(this.cellView(p, i), this.params);
    p.gs[i] = NG;
    p.gsProt[i] = PROTEIN_GENES;
    p.corrMiss[i] = 0;
    p.line[i] = ++this.lines;
    this.captures++;
    this.events.push({ kind: 'capture', id: p.id[i] });
  }

  loseGuests(p, i) {
    p.ns[i] = 0;
    p.gx[i] = 0;
    p.gs[i] = 0;
    p.gsProt[i] = 0;
    p.corrMiss[i] = 0;
    p.line[i] = 0;
    p.sym.fill(0, i * W, i * W + W);
    this.lost++;
    this.events.push({ kind: 'lose', id: p.id[i] });
  }

  // A run of neighbouring genes is deleted from one guest. If the guest
  // still needed one of them and the host does not make it, that guest dies
  // and nothing changes. Otherwise the smaller genome copies faster and can
  // take over the guests in its host, unless it gave up control of its own
  // respiratory chain.
  symDeletion(p, i) {
    const { rng } = this;
    const base = i * W;
    const len = rng.geometric(K.symDelLen);
    const start = rng.int(NG);
    const block = [];
    for (let k = 0; k < NG && block.length < len; k++) {
      const g = ORDER[(start + k) % NG];
      if (has(p.sym, base, g)) block.push(g);
    }
    if (!block.length) return;
    let prot = 0;
    for (const g of block) prot += G_PROT[g];
    const protLeft = p.gsProt[i] - prot;
    let corr = 0;
    for (const g of block) {
      if (!has(p.nuc, base, g)) {
        const need = G_NEED[g];
        if (need === 1 || (need === 2 && protLeft > 0)) return; // that guest dies
      }
      corr += G_CORR[g];
    }
    const P = this.params;
    const sw = (0.5 * block.length) / Math.max(1, p.gs[i]) - (P.corr ? 0.2 * corr : 0);
    const accept = sw > 0 ? Math.min(1, 0.5 + 10 * sw) : 0.005;
    if (!rng.chance(accept)) return;
    for (const g of block) {
      clear(p.sym, base, g);
      p.gs[i]--;
      p.gsProt[i] -= G_PROT[g];
      if (G_CORR[g]) p.corrMiss[i]++;
    }
    // with no protein genes left, the guest's genetic system has nothing to
    // do and the rest of its genome goes too
    if (p.gsProt[i] === 0 && p.gs[i] > 0) {
      for (let g = 0; g < NG; g++) if (has(p.sym, base, g)) clear(p.sym, base, g);
      p.gs[i] = 0;
    }
    this.events.push({ kind: 'shrink', id: p.id[i], n: block.length });
  }

  // DNA from a dead guest lands in the host genome. A gene works there only
  // if the host reads it and its protein can find its way back into the
  // guests: with no import machinery that almost never happens.
  integrate(p, i) {
    const { rng } = this;
    const P = this.params;
    const base = i * W;
    const len = rng.geometric(K.transferLen);
    const start = rng.int(NG);
    const imp = P.importable ? Math.min(1, p.mod[i * NMOD + MOD.import] / MODULES[MOD.import].size) : 0;
    const ok = P.importable ? Math.min(1, (K.importBase + (1 - K.importBase) * imp) * P.importEase) : 0;
    let n = 0;
    let worked = 0;
    for (let k = 0; k < NG && n < len; k++) {
      const g = ORDER[(start + k) % NG];
      if (!has(p.sym, base, g)) continue;
      n++;
      if (has(p.nuc, base, g)) continue;
      const e = P.anyImport ? (G_NEED[g] ? 1 : 0) : G_IMP[g];
      if (e > 0 && rng.chance(Math.min(1, e * ok))) {
        set(p.nuc, base, g);
        p.bact[i]++;
        worked++;
        this.transfers++;
        // a bacterial enzyme can take over from an archaeal one
        const kind = G_KIND[g];
        if ((kind === KIND.metab || kind === KIND.membrane) && p.arch[i] > HOST_GENES - HOST_REPLACEABLE && rng.chance(0.5)) p.arch[i]--;
      } else p.junk[i]++;
    }
    p.introns[i] += rng.poisson(K.intronsPerEvent);
    this.events.push({ kind: 'transfer', id: p.id[i], n, worked });
  }

  // New host genes by duplication: new enzymes, regulators, signals.
  duplicate(p, i) {
    p.extra[i] += this.rng.geometric(K.dupLen);
  }

  // A new gene that adds to one of the modules.
  innovate(p, i) {
    const { rng } = this;
    const P = this.params;
    const mb = i * NMOD;
    let tot = 0;
    const wts = MODULES.map((m, j) => {
      const allowed = !(j === MOD.import && !P.importable) && !(j === MOD.aac && !P.aac) && !(j === MOD.phago && !P.phago);
      const wgt = allowed && p.mod[mb + j] < m.size ? m.rate : 0;
      tot += wgt;
      return wgt;
    });
    if (!(tot > 0)) return;
    let u = rng.float() * tot;
    let j = 0;
    while (j < NMOD - 1 && u >= wts[j]) u -= wts[j++];
    p.mod[mb + j]++;
  }

  // A run of host genes is lost: new genes, module genes, spare copies of
  // guest genes, or broken copies. Archaeal genes and copies the guests
  // depend on are not in the pool: losing them would kill the cell.
  hostDeletion(p, i) {
    const { rng } = this;
    const n = rng.geometric(K.hostDelLen);
    const mb = i * NMOD;
    const base = i * W;
    let spare = 0;
    for (let k = 0; k < W; k++) spare += popcnt(p.nuc[base + k] & p.sym[base + k]);
    for (let k = 0; k < n; k++) {
      let modTot = 0;
      for (let j = 0; j < NMOD; j++) modTot += p.mod[mb + j];
      const pools = [p.extra[i], modTot, spare, p.junk[i]];
      const tot = pools[0] + pools[1] + pools[2] + pools[3];
      if (tot <= 0) return;
      let u = rng.float() * tot;
      if (u < pools[0]) p.extra[i]--;
      else if ((u -= pools[0]) < pools[1]) {
        let v = u;
        for (let j = 0; j < NMOD; j++) {
          if (v < p.mod[mb + j]) {
            p.mod[mb + j]--;
            break;
          }
          v -= p.mod[mb + j];
        }
      } else if ((u -= pools[1]) < pools[2]) {
        // drop one spare copy: the guest still has its own
        let target = Math.floor(u);
        for (let k2 = 0; k2 < W; k2++) {
          const m = p.nuc[base + k2] & p.sym[base + k2];
          const c = popcnt(m);
          if (target < c) {
            for (let bit = 0; bit < 32; bit++) {
              if ((m >>> bit) & 1) {
                if (target === 0) {
                  p.nuc[base + k2] &= ~(1 << bit);
                  break;
                }
                target--;
              }
            }
            break;
          }
          target -= c;
        }
        p.bact[i]--;
        spare--;
      } else p.junk[i]--;
    }
  }

  // ---------------------------------------------------------------- the Lab

  inject(kind) {
    const { rng } = this;
    const p = this.A;
    const note = (text) => this.log.push({ step: this.step, kind: 'lab', text });
    switch (kind) {
      case 'capture': {
        const arch = [];
        for (let i = 0; i < this.N; i++) if (p.ns[i] === 0) arch.push(i);
        if (!arch.length) {
          note('Every cell already has guests.');
          break;
        }
        const i = arch[rng.int(arch.length)];
        this.capture(p, i);
        note('You put a bacterium inside an archaeon.');
        break;
      }
      case 'spill': {
        let n = 0;
        for (let i = 0; i < this.N; i++) {
          if (p.ns[i] > 0) {
            for (let k = 0; k < 10 && p.gs[i] > 0; k++) this.integrate(p, i);
            n++;
          }
        }
        note(n ? 'Guests burst and spilled their DNA into every host.' : 'No cell has guests yet.');
        break;
      }
      case 'aac': {
        if (!this.params.aac) {
          note('The ADP/ATP carrier is switched off in this experiment.');
          break;
        }
        for (let i = 0; i < this.N; i++) p.mod[i * NMOD + MOD.aac] = MODULES[MOD.aac].size;
        note('Every cell now has the genes for the ADP/ATP carrier. It works only where the host can import proteins into its guests.');
        break;
      }
      case 'cure': {
        let n = 0;
        for (let i = 0; i < this.N; i++) {
          if (p.ns[i] > 0 && rng.chance(0.5)) {
            this.loseGuests(p, i);
            n++;
          }
        }
        note(n ? `Half the cells lost all their guests (${n} cells).` : 'No cell has guests to lose.');
        break;
      }
      default:
        return;
    }
    this.assessAll(p);
    if (this.history.length) this.history[this.history.length - 1] = this.summary();
  }

  // ---------------------------------------------------------------- records

  // The typical cell: among cells with guests (if more than a few have
  // them), the one at the median guest genome size; otherwise the archaeon
  // with the median genome.
  typical() {
    const p = this.A;
    const withGuests = [];
    const without = [];
    for (let i = 0; i < this.N; i++) (p.ns[i] > 0 ? withGuests : without).push(i);
    if (withGuests.length > this.N * 0.05) {
      withGuests.sort((x, y) => p.gs[x] - p.gs[y] || p.id[x] - p.id[y]);
      return withGuests[withGuests.length >> 1];
    }
    const size = (i) => p.extra[i] + p.bact[i] + sumMod(p.mod.subarray(i * NMOD, i * NMOD + NMOD));
    without.sort((x, y) => size(x) - size(y) || p.id[x] - p.id[y]);
    return without[without.length >> 1];
  }

  summary() {
    const p = this.A;
    const P = this.params;
    let withGuests = 0;
    let mu = 0;
    const lines = new Set();
    for (let i = 0; i < this.N; i++) {
      if (p.ns[i] > 0) withGuests++;
      if (p.line[i]) lines.add(p.line[i]);
      mu += p.mu[i];
    }
    const t = this.typical();
    const c = this.cellView(p, t);
    const bd = budget(c, P);
    const bac = bacteriumBudget(P);
    const lin = bd.fx.lin;
    return {
      step: this.step,
      gen: this.step * K.G,
      share: withGuests / this.N,
      mu: mu / this.N,
      // the typical cell
      ns: c.ns,
      gs: c.gs,
      gsProt: c.gsProt,
      gh: bd.genes,
      arch: c.arch,
      bact: c.bact,
      extra: c.extra,
      junk: c.junk,
      introns: c.introns,
      modGenes: sumMod(c.mod),
      V: bd.V,
      vc: c.vc,
      power: bd.power,
      hostPower: bd.hostPower,
      // the parts of the energy budget, for the picture and the explanations
      food: bd.food,
      foodSurface: bd.surface,
      foodEndo: bd.endo,
      foodPhago: bd.phago,
      ferm: bd.ferm,
      resp: bd.resp,
      upkeepHost: bd.upkeepHost,
      upkeepGenes: bd.upkeepGenes,
      upkeepSym: bd.upkeepSym,
      buildHost: bd.buildHost,
      buildSym: bd.buildSym,
      copies: bd.copies,
      transport: bd.transport,
      intronEff: bd.intron,
      loadEff: bd.load,
      perGene: bd.power / bd.genes,
      perGeneRel: bd.power / bd.genes / bac.perGene,
      doubling: bd.mu > 0 ? LN2 / bd.mu : Infinity,
      atpShare: bd.share,
      limit: bd.limit,
      mods: lin.map((f) => Math.round(f * 1000) / 1000),
      lines: lines.size,
      line: p.line[t],
      captures: this.captures,
      transfers: this.transfers,
      lost: this.lost,
    };
  }

  record() {
    const h = this.summary();
    this.history.push(h);
    this.notes(h);
  }

  notes(h) {
    const m = this.marks;
    const say = (key, kind, text) => {
      if (m[key]) return;
      m[key] = this.step;
      this.log.push({ step: this.step, kind, text });
    };
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    for (const e of this.events) {
      if (e.kind === 'capture') say('firstCapture', 'merger', 'An archaeon has closed its protrusions around a bacterium: a cell inside a cell.');
      if (e.kind === 'lose' && m.firstCapture) say('firstLoss', 'merger', 'A cell has lost its guests: none of them was passed on when it divided, so its daughter is a plain archaeon again.');
    }
    const settled = h.share > 0.5;
    if (settled) say('sweep', 'merger', 'Cells with guests inside now outnumber plain archaea.');
    if (!settled) return;
    if (h.mods[MOD.import] >= 0.999) say('import', 'host', 'The host can now send its own proteins into its guests.');
    if (h.gs < 1500) say('outside', 'genes', `The guests have lost most of the genes they needed to live outside: ${fmt(h.gs)} genes left.`);
    if (h.atpShare > 0.5) say('aac', 'host', 'The ADP/ATP carrier: the guests now hand over most of their ATP. They have become mitochondria.');
    if (h.gs < 700) say('g700', 'genes', `The guest genome is down to ${fmt(h.gs)} genes, as small as that of an insect endosymbiont like Buchnera.`);
    if (h.gh > 6000) say('g6000', 'host', `The host genome has passed 6,000 genes: more than almost any archaeon has.`);
    if (h.gs < 200) say('g200', 'genes', `Only ${fmt(h.gs)} genes are left in the guest genome; the host makes nearly everything its guests need.`);
    if (h.mods[MOD.nucleus] >= 0.999) say('nucleus', 'host', 'A nucleus now encloses the host genome.');
    if (h.mods[MOD.endo] >= 0.999) say('endo', 'host', 'A full set of inner membranes: endoplasmic reticulum, Golgi and vesicles.');
    if (h.mods[MOD.cyto] >= 0.999) say('cyto', 'host', 'A full cytoskeleton: the cell can grow large and move cargo across itself.');
    if (h.mods[MOD.phago] >= 0.999) say('phago', 'host', 'Phagocytosis: the cell eats bacteria whole.');
    if (h.mods[MOD.sex] >= 0.999) say('sex', 'host', 'Sex: meiosis and cell fusion shuffle the genome.');
    if (h.V > 1000) say('big', 'cell', 'The typical cell is now more than 1,000 µm³: a thousand times a bacterium.');
    if (h.gs > 0 && h.gs < 100) say('g100', 'genes', `The guest genome is down to ${fmt(h.gs)} genes, in the range of real mitochondrial genomes.`);
  }

  // The retained and transferred genes of the typical cell, for the genome
  // picture and the Validation tab.
  genome() {
    const p = this.A;
    const t = this.typical();
    const base = t * W;
    const kept = [];
    const moved = [];
    for (let g = 0; g < NG; g++) {
      if (has(p.sym, base, g)) kept.push(g);
      else if (has(p.nuc, base, g)) moved.push(g);
    }
    return { kept, moved, ns: p.ns[t] };
  }

  // What the page draws: a sample of cells that follows lines of descent,
  // the typical cell in full, and this step's events.
  frame(count = 30) {
    const p = this.A;
    const byId = new Map();
    for (let i = 0; i < this.N; i++) if (!byId.has(p.id[i])) byId.set(p.id[i], i);
    // keep showing cells whose line goes on
    const keep = this.shown.filter((id) => byId.has(id));
    const shown = new Set(keep);
    // fill the gaps, keeping the share of cells with guests about right
    let guests = 0;
    for (let i = 0; i < this.N; i++) if (p.ns[i] > 0) guests++;
    const want = Math.round((count * guests) / this.N);
    let shownGuests = keep.filter((id) => p.ns[byId.get(id)] > 0).length;
    // the newest merger is always worth showing
    for (const e of this.events) {
      if (e.kind === 'capture' && byId.has(e.id) && !shown.has(e.id) && shown.size < count + 4) {
        shown.add(e.id);
        keep.push(e.id);
        shownGuests++;
      }
    }
    const order = [];
    for (let i = 0; i < this.N; i++) order.push(i);
    // a fixed shuffle per step, from the step number, so the sample is
    // deterministic without using the simulation's random numbers
    let h = (this.step * 2654435761) >>> 0;
    for (let i = order.length - 1; i > 0; i--) {
      h = (Math.imul(h ^ (h >>> 15), 2246822519) + 3266489917) >>> 0;
      const j = h % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const i of order) {
      if (keep.length >= count) break;
      const id = p.id[i];
      if (shown.has(id)) continue;
      const g = p.ns[i] > 0;
      if (g && shownGuests >= Math.max(want, guests ? 1 : 0)) continue;
      if (!g && keep.length - shownGuests >= count - want) continue;
      shown.add(id);
      keep.push(id);
      if (g) shownGuests++;
    }
    this.shown = keep;
    const cells = keep.map((id) => {
      const i = byId.get(id);
      return {
        id,
        V: p.vc[i] + p.ns[i] * K.symV,
        vc: p.vc[i],
        ns: p.ns[i],
        gs: p.gs[i],
        line: p.line[i],
        mods: MODULES.map((m, k) => Math.min(1, p.mod[i * NMOD + k] / m.size)),
        mu: p.mu[i],
      };
    });
    const t = this.typical();
    const base = t * W;
    return {
      step: this.step,
      gen: this.step * K.G,
      done: this.done,
      cells,
      typical: {
        id: p.id[t],
        sym: Array.from(p.sym.subarray(base, base + W)),
        nuc: Array.from(p.nuc.subarray(base, base + W)),
        mods: Array.from(p.mod.subarray(t * NMOD, t * NMOD + NMOD)),
      },
      events: this.events.slice(0, 40),
    };
  }

  // Static facts the page needs once.
  geometry() {
    return {
      genes: GENES.map((g) => [g.name, g.kind, g.tm, g.corr, g.prot]),
      display: Array.from(DISPLAY),
      kinds: KINDS.map((k) => ({ key: k.key, label: k.label, about: k.about })),
      modules: MODULES.map((m) => ({ key: m.key, label: m.label, size: m.size, about: m.about })),
      hostGenes: HOST_GENES,
      N: this.N,
      G: K.G,
      steps: K.steps,
      archV: K.archV,
      symV: K.symV,
      bactV: K.bactV,
    };
  }
}
