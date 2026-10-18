// The picture, on a dark field like a fluorescence micrograph, in three
// views. Cells: a sample of the population drifting in the pond, each drawn
// by what it has become. Genes: the typical cell's two genomes. Energy: the
// typical cell's energy budget for a day.

export const COLORS = {
  arch: [240, 176, 76], // the archaeal host
  guest: [95, 211, 154], // a guest still much like a bacterium
  mito: [255, 112, 80], // a guest that has become a mitochondrion
  dna: [118, 146, 255], // DNA, the nucleus
  er: [236, 122, 196], // inner membranes
  cyto: [120, 214, 236], // the cytoskeleton
  partner: [196, 204, 255], // partner microbes outside
  food: [120, 128, 150], // food not burnt
  outside: [150, 148, 178],
  supply: [240, 176, 76],
  metab: [95, 211, 154],
  genetic: [100, 196, 244],
  resp: [255, 112, 80],
  membrane: [236, 122, 196],
  rna: [246, 222, 96],
  extra: [190, 182, 236],
  junk: [96, 96, 116],
};

const MOD_LABELS = ['Import', 'Carrier', 'Nucleus', 'ER', 'Skeleton', 'Eating', 'Sex'];
const NIMPORT = 0;
const NCYTO = 4;
const NENDO = 3;
const NNUC = 2;
const NPHAGO = 5;

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const across = (v) => Math.cbrt((6 * v) / Math.PI);
const LOG_START = Math.log(3033);
const LOG_MITO = Math.log(60);
const fmtInt = (x) => Math.round(x).toLocaleString('en-US');
const GOLD = [236, 200, 92];
// a guest's colour as it turns from a bacterium (0) into a mitochondrion (1)
const guestColor = (t) => (t < 0.5 ? mix(COLORS.guest, GOLD, t * 2) : mix(GOLD, COLORS.mito, t * 2 - 1));

// A small deterministic hash, for placing guests and arms the same way on
// every frame.
function hash(a, b = 0) {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

function sizeLabel(v) {
  const d = across(v);
  return `${d < 10 ? d.toFixed(d < 1 ? 2 : 1) : Math.round(d)} µm`;
}

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = 'cells';
    this.geometry = null;
    this.frame = null;
    this.h = null;
    this.first = null; // the first record of the run, for the ruler
    this.cells = new Map(); // id → where it is drawn
    this.ghosts = [];
    this.flashes = [];
    this.particles = [];
    this.bacteria = [];
    this.W = 1;
    this.H = 1;
    this.last = 0;
    this.prevTyp = null;
    this.grid = null; // where each gene's square is, in the genes view
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setGeometry(g) {
    this.geometry = g;
    this.cells.clear();
    this.ghosts = [];
    this.flashes = [];
    this.particles = [];
    this.prevTyp = null;
    this.first = null;
    this.bacteria = [];
    for (let i = 0; i < 12; i++) this.bacteria.push(this.newBacterium(i, true));
    // the genes of each kind, in the order the grid draws them
    const kinds = g.kinds.length;
    this.byKind = Array.from({ length: kinds }, () => []);
    for (const gi of g.display) this.byKind[g.genes[gi][1]].push(gi);
  }

  newBacterium(i, anywhere = false) {
    const r = hash(i + 1, (this.bacteria.length + 7) * 13 + Math.floor(this.last / 1000));
    return {
      u: anywhere ? hash(i, 3) : r < 0.5 ? 0 : 0.999,
      v: hash(i, 5),
      a: hash(i, 7) * Math.PI * 2,
      s: 0.6 + 0.4 * hash(i, 9),
      eaten: 0,
    };
  }

  setView(v) {
    this.view = v;
    this.particles = [];
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.grid = null;
  }

  // ------------------------------------------------------------ new data

  setFrame(frame, h, first) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    this.first = first ?? this.first;
    const seen = new Set();
    for (const c of frame.cells) {
      seen.add(c.id);
      let s = this.cells.get(c.id);
      if (!s) {
        // a new line of descent appears where there is most room
        const [u, v] = this.freeSpot(c.id);
        s = {
          id: c.id,
          u,
          v,
          vu: 0,
          vv: 0,
          born: now,
          phase: hash(c.id, 4) * Math.PI * 2,
        };
        this.cells.set(c.id, s);
      }
      s.c = c;
    }
    for (const [id, s] of this.cells) {
      if (!seen.has(id)) {
        this.ghosts.push({ ...s, gone: now });
        this.cells.delete(id);
      }
    }
    this.order = frame.cells.map((c) => c.id);
    for (const e of frame.events) {
      if ((e.kind === 'capture' || e.kind === 'lose') && this.cells.has(e.id)) this.flashes.push({ id: e.id, kind: e.kind, t: now });
    }
    if (this.flashes.length > 6) this.flashes.splice(0, this.flashes.length - 6);
    this.geneChanges(frame.typical, now);
    this.frame = frame;
    this.h = h;
  }

  // The emptiest of a few places picked by the cell's id (the farthest from
  // the cells already drawn, across the wrapped edges).
  freeSpot(id) {
    const { W, H } = this;
    let best = [hash(id, 2), hash(id, 3)];
    let bestD = -1;
    for (let k = 0; k < 16; k++) {
      const u = hash(id, 30 + k);
      const v = hash(id, 60 + k);
      let d = Infinity;
      for (const o of this.cells.values()) {
        let dx = Math.abs(o.u - u) * W;
        let dy = Math.abs(o.v - v) * H;
        if (dx > W / 2) dx = W - dx;
        if (dy > H / 2) dy = H - dy;
        d = Math.min(d, dx * dx + dy * dy);
      }
      if (d > bestD) {
        bestD = d;
        best = [u, v];
      }
    }
    return best;
  }

  // Genes the typical cell lost or moved since the last frame, animated in
  // the genes view.
  geneChanges(t, now) {
    const prev = this.prevTyp;
    this.prevTyp = t;
    if (!prev || prev.id !== t.id || this.view !== 'genes' || !this.grid || this.reduced) return;
    let budget = 40;
    for (let w = 0; w < t.sym.length && budget > 0; w++) {
      const lost = prev.sym[w] & ~t.sym[w];
      const moved = t.nuc[w] & ~prev.nuc[w];
      if (!lost && !moved) continue;
      for (let b = 0; b < 32 && budget > 0; b++) {
        const g = w * 32 + b;
        const sq = this.grid.at[g];
        if (!sq) continue;
        if ((moved >>> b) & 1) {
          this.particles.push({ kind: 'move', g, x: sq.x, y: sq.y, t: now, dur: 900 + 300 * hash(g, 11) });
          budget--;
        } else if ((lost >>> b) & 1 && !((t.nuc[w] >>> b) & 1)) {
          this.particles.push({ kind: 'lose', g, x: sq.x, y: sq.y, t: now, dur: 700 });
          budget--;
        }
      }
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  // ------------------------------------------------------------ drawing

  draw(now) {
    const dt = Math.min(0.05, Math.max(0, (now - (this.last || now)) / 1000));
    this.last = now;
    const ctx = this.ctx;
    const { W, H } = this;
    // the dark field
    const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#111527');
    g.addColorStop(1, '#05060c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (!this.frame || !this.h) return;
    if (this.view === 'genes') this.drawGenes(now);
    else if (this.view === 'energy') this.drawEnergy();
    else this.drawCells(now, dt);
  }

  // ---- cells

  // Drawn width of a cell: sizes are squeezed (as the cube root of volume
  // to the power 0.72) so that archaea of 0.5 µm and cells of 30 µm both fit.
  radius(V) {
    const base = clamp(this.W / 26, 14, 24);
    return (base / 2) * Math.pow(across(V) / 0.55, 0.24);
  }

  drawCells(now, dt) {
    const ctx = this.ctx;
    const { W, H } = this;
    const move = !this.reduced;
    // how many of the sampled cells fit without crowding
    const ids = this.order ?? [];
    let area = 0;
    let shown = 0;
    for (const id of ids) {
      const s = this.cells.get(id);
      if (!s) continue;
      const r = this.radius(s.c.V);
      if (shown >= 6 && area + Math.PI * r * r > 0.2 * W * H) break;
      area += Math.PI * r * r;
      shown++;
    }
    const visible = ids.slice(0, shown).map((id) => this.cells.get(id)).filter(Boolean);
    // drift, with a gentle push apart
    if (move) {
      for (const s of visible) {
        s.vu += (hash(s.id, Math.floor(now / 1600)) - 0.5) * 0.00025 * dt * 60;
        s.vv += (hash(s.id + 7, Math.floor(now / 1700)) - 0.5) * 0.00025 * dt * 60;
      }
      for (let i = 0; i < visible.length; i++) {
        const a = visible[i];
        const ra = this.radius(a.c.V);
        for (let j = i + 1; j < visible.length; j++) {
          const b = visible[j];
          let dx = (b.u - a.u) * W;
          let dy = (b.v - a.v) * H;
          if (dx > W / 2) dx -= W;
          if (dx < -W / 2) dx += W;
          if (dy > H / 2) dy -= H;
          if (dy < -H / 2) dy += H;
          const d = Math.hypot(dx, dy) || 1;
          const want = ra + this.radius(b.c.V) + 10;
          if (d < want) {
            const f = ((want - d) / want) * 0.006;
            a.vu -= (dx / d) * f;
            a.vv -= (dy / d) * f;
            b.vu += (dx / d) * f;
            b.vv += (dy / d) * f;
          }
        }
      }
      for (const s of visible) {
        s.vu *= 0.94;
        s.vv *= 0.94;
        const cap = 0.0035;
        s.vu = clamp(s.vu, -cap, cap);
        s.vv = clamp(s.vv, -cap, cap);
        s.u = (s.u + s.vu * dt * 8 + 1) % 1;
        s.v = (s.v + s.vv * dt * 8 + 1) % 1;
      }
    }
    // free bacteria in the water, which cells that can eat whole catch
    this.drawBacteria(visible, now, dt);
    ctx.save();
    for (const s of visible) this.drawCell(s, now, 1);
    // cells whose line ended fade away
    this.ghosts = this.ghosts.filter((s) => now - s.gone < 450);
    for (const s of this.ghosts) if (s.c) this.drawCell(s, now, 1 - (now - s.gone) / 450);
    ctx.restore();
    this.drawFlashes(now);
    this.drawCellNotes();
  }

  drawBacteria(visible, now, dt) {
    const ctx = this.ctx;
    const { W, H } = this;
    const eaters = visible.filter((s) => s.c.mods[NPHAGO] > 0.5);
    const len = this.radius(1) * 1.1;
    for (let i = 0; i < this.bacteria.length; i++) {
      const b = this.bacteria[i];
      if (!this.reduced) {
        b.a += (hash(i, Math.floor(now / 2000)) - 0.5) * 0.04;
        b.u = (b.u + Math.cos(b.a) * 0.0009 * b.s * dt * 30 + 1) % 1;
        b.v = (b.v + Math.sin(b.a) * 0.0009 * b.s * dt * 30 + 1) % 1;
      }
      const x = b.u * W;
      const y = b.v * H;
      if (b.eaten) {
        b.eaten += dt;
        if (b.eaten > 1.2) this.bacteria[i] = this.newBacterium(i + Math.floor(now), false);
        continue;
      }
      for (const s of eaters) {
        const r = this.radius(s.c.V);
        const d = Math.hypot(s.u * W - x, s.v * H - y);
        if (d < r * 0.95) {
          b.eaten = dt || 0.01;
          s.meal = now;
        }
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(b.a);
      ctx.fillStyle = rgba(COLORS.guest, 0.32);
      ctx.strokeStyle = rgba(COLORS.guest, 0.55);
      ctx.lineWidth = 1;
      capsule(ctx, len, len * 0.42);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCell(s, now, alpha) {
    const ctx = this.ctx;
    const { W, H } = this;
    const c = s.c;
    const R = this.radius(c.V);
    const born = clamp((now - s.born) / 500, 0, 1);
    const a = alpha * (0.35 + 0.65 * born);
    const x = s.u * W;
    const y = s.v * H;
    const m = c.mods;
    const cyto = m[NCYTO];
    const t = this.reduced ? 0 : now / 1000;
    // wrap: draw again across the edge if the cell overlaps it
    const xs = [x];
    const ys = [y];
    if (x < R * 2.4) xs.push(x + W);
    if (x > W - R * 2.4) xs.push(x - W);
    if (y < R * 2.4) ys.push(y + H);
    if (y > H - R * 2.4) ys.push(y - H);
    for (const X of xs) for (const Y of ys) this.cellAt(X, Y, R, c, s, t, a, cyto, m, now);
  }

  cellAt(x, y, R, c, s, t, a, cyto, m, now) {
    const ctx = this.ctx;
    const eukaryotic = Math.max(m[NNUC], cyto, m[NENDO]);
    // the outline: round for archaea, wobbling and reaching out once there
    // is a cytoskeleton
    const pts = 40;
    const outline = [];
    for (let k = 0; k < pts; k++) {
      const th = (k / pts) * Math.PI * 2;
      const wob = 0.025 * Math.sin(3 * th + s.phase + t * 0.9) + cyto * (0.06 * Math.sin(2 * th + s.phase * 2 + t * 0.6) + 0.05 * Math.sin(5 * th - t * 0.8 + s.phase));
      const r = R * (1 + wob);
      outline.push([x + r * Math.cos(th), y + r * Math.sin(th)]);
    }
    const path = () => {
      ctx.beginPath();
      for (let k = 0; k < pts; k++) {
        const p = outline[k];
        const q = outline[(k + 1) % pts];
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        if (k === 0) ctx.moveTo(mx, my);
        else ctx.quadraticCurveTo(p[0], p[1], mx, my);
      }
      const p = outline[0];
      const q = outline[1];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      ctx.closePath();
    };
    // protrusions with partners on them, while the cell is still archaeal
    const arms = 1 - cyto;
    if (arms > 0.05 && R < 40) {
      const n = 5 + Math.floor(hash(s.id, 21) * 3);
      ctx.lineWidth = 1;
      for (let k = 0; k < n; k++) {
        const th = s.phase + (k / n) * Math.PI * 2 + 0.3 * hash(s.id, k);
        const L = R * (0.9 + 0.8 * hash(s.id, k + 40));
        const sway = 0.35 * Math.sin(t * 0.7 + k * 1.7 + s.phase);
        const bx = x + R * Math.cos(th);
        const by = y + R * Math.sin(th);
        const cx = x + (R + L * 0.55) * Math.cos(th + sway * 0.6);
        const cy = y + (R + L * 0.55) * Math.sin(th + sway * 0.6);
        const ex = x + (R + L) * Math.cos(th + sway);
        const ey = y + (R + L) * Math.sin(th + sway);
        ctx.strokeStyle = rgba(COLORS.arch, 0.45 * a * arms);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();
        if (hash(s.id, k + 80) < 0.55) {
          ctx.fillStyle = rgba(COLORS.partner, 0.7 * a * arms);
          ctx.beginPath();
          ctx.arc(ex, ey, Math.max(1.3, R * 0.13), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // cytoplasm
    const fill = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R * 1.05);
    const tint = mix(COLORS.arch, [176, 168, 214], clamp(eukaryotic, 0, 1));
    fill.addColorStop(0, rgba(tint, 0.2 * a));
    fill.addColorStop(1, rgba(tint, 0.07 * a));
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.save();
    path();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    // the cytoskeleton
    if (cyto > 0.15) {
      ctx.strokeStyle = rgba(COLORS.cyto, 0.2 * cyto * a);
      ctx.lineWidth = 0.7;
      const n = 10;
      for (let k = 0; k < n; k++) {
        const th = s.phase * 0.7 + (k / n) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + R * 0.28 * Math.cos(th), y + R * 0.28 * Math.sin(th));
        ctx.lineTo(x + R * 0.98 * Math.cos(th + 0.12), y + R * 0.98 * Math.sin(th + 0.12));
        ctx.stroke();
      }
    }
    // inner membranes around the nucleus
    const endo = m[NENDO];
    if (endo > 0.15 && R > 9) {
      ctx.strokeStyle = rgba(COLORS.er, 0.55 * endo * a);
      ctx.lineWidth = 0.9;
      for (let k = 0; k < 3; k++) {
        const rr = R * (0.42 + 0.09 * k);
        const start = s.phase + k * 1.3;
        ctx.beginPath();
        for (let q = 0; q <= 24; q++) {
          const th = start + (q / 24) * Math.PI * 1.3;
          const w = rr * (1 + 0.06 * Math.sin(q * 1.6 + k));
          const px = x + w * Math.cos(th);
          const py = y + w * Math.sin(th);
          if (q === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    // DNA: a loose nucleoid at first, a nucleus with its envelope later
    const nuc = m[NNUC];
    const rn = R * (0.3 + 0.04 * nuc);
    ctx.fillStyle = rgba(COLORS.dna, (0.16 + 0.24 * nuc) * a);
    ctx.beginPath();
    if (nuc < 0.5) {
      for (let q = 0; q <= 12; q++) {
        const th = (q / 12) * Math.PI * 2;
        const w = rn * (0.75 + 0.3 * hash(s.id, q + 100));
        if (q === 0) ctx.moveTo(x + w * Math.cos(th), y + w * Math.sin(th));
        else ctx.lineTo(x + w * Math.cos(th), y + w * Math.sin(th));
      }
    } else ctx.arc(x, y, rn, 0, Math.PI * 2);
    ctx.fill();
    if (nuc >= 0.5) {
      ctx.strokeStyle = rgba(COLORS.dna, 0.85 * nuc * a);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(x, y, rn, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, rn + 1.6, 0, Math.PI * 2);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    // food being digested
    const phago = m[NPHAGO];
    if (phago > 0.3 && R > 10) {
      const n = 1 + Math.floor(phago * 2) + (s.meal && performance.now() - s.meal < 4000 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const th = s.phase + 2.1 * k + 0.5;
        const rr = R * (0.62 + 0.12 * hash(s.id, k + 300));
        const px = x + rr * Math.cos(th);
        const py = y + rr * Math.sin(th);
        ctx.strokeStyle = rgba(COLORS.er, 0.6 * phago * a);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, R * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rgba(COLORS.guest, 0.6 * phago * a);
        ctx.beginPath();
        ctx.arc(px, py, R * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // the guests
    if (c.ns > 0) {
      const tg = clamp((LOG_START - Math.log(Math.max(1, c.gs))) / (LOG_START - LOG_MITO), 0, 1);
      const col = guestColor(tg);
      const cap = Math.max(1, Math.min(c.ns, Math.floor((R * R) / 14), 60));
      const len = Math.max(2.6, R * 0.17);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(col, 0.78 * a);
      for (let k = 0; k < cap; k++) {
        const u = hash(s.id * 131 + k, 1);
        const rr = R * (0.4 + 0.5 * Math.sqrt(hash(s.id * 131 + k, 2)));
        const th = u * Math.PI * 2 + 0.06 * Math.sin(t * 0.5 + k);
        ctx.save();
        ctx.translate(x + rr * Math.cos(th), y + rr * Math.sin(th));
        ctx.rotate(hash(s.id * 131 + k, 3) * Math.PI + 0.2 * Math.sin(t * 0.4 + k * 0.7));
        capsule(ctx, len, len * 0.46);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    // the membrane, with a soft glow
    path();
    ctx.strokeStyle = rgba(COLORS.arch, 0.22 * a);
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = rgba(COLORS.arch, 0.9 * a);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  drawFlashes(now) {
    const ctx = this.ctx;
    const { W, H } = this;
    this.flashes = this.flashes.filter((f) => now - f.t < 2600);
    let labels = 0;
    for (const f of this.flashes) {
      const s = this.cells.get(f.id);
      if (!s) continue;
      const k = (now - f.t) / 2600;
      const R = this.radius(s.c.V);
      const x = s.u * W;
      const y = s.v * H;
      const col = f.kind === 'capture' ? COLORS.guest : COLORS.partner;
      ctx.strokeStyle = rgba(col, 0.8 * (1 - k));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, R * (1.3 + 1.2 * k), 0, Math.PI * 2);
      ctx.stroke();
      if (labels < 2) {
        labels++;
        ctx.font = '600 11.5px "Figtree", system-ui, sans-serif';
        ctx.textAlign = x > W - 120 ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba([255, 255, 255], 0.92 * (1 - k * k));
        const tx = x + (ctx.textAlign === 'left' ? R * 1.5 + 4 : -R * 1.5 - 4);
        ctx.fillText(f.kind === 'capture' ? 'takes a partner inside' : 'loses its guests', tx, clamp(y - R * 1.2, 10, H - 10));
      }
    }
  }

  // the size of the typical cell, and the cell and a bacterium to scale
  drawCellNotes() {
    const ctx = this.ctx;
    const { W, H } = this;
    const h = this.h;
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const note = `typical cell ${sizeLabel(h.V)} across`;
    plate(ctx, 42, H - 30, ctx.measureText(note).width + 8, 22);
    ctx.fillStyle = 'rgba(232,230,245,0.86)';
    ctx.fillText(note, 46, H - 14);
    // the inset
    const box = W < 500 ? 32 : 46;
    const bx = W - box - 12;
    const by = H - box - 22;
    ctx.font = '500 9.5px "Figtree", system-ui, sans-serif';
    const pw = ctx.measureText('to scale: cell, bacterium').width + 12;
    plate(ctx, W - pw - 4, by - 6, pw, box + 26);
    const dc = across(h.V);
    const db = across(1);
    const big = Math.max(dc, db);
    const rc = (box / 2) * (dc / big);
    const rb = (box / 2) * (db / big);
    ctx.strokeStyle = rgba(COLORS.arch, 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx + box / 2, by + box / 2, Math.max(0.8, rc), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(COLORS.guest, 0.85);
    ctx.beginPath();
    const bxx = rc >= rb ? bx + box / 2 + rc + rb + 4 : bx + box / 2;
    ctx.arc(Math.min(W - 3, bxx), by + box / 2 + (rc >= rb ? rc - rb : 0), Math.max(0.9, rb), 0, Math.PI * 2);
    if (rc >= rb) ctx.fill();
    else {
      ctx.strokeStyle = rgba(COLORS.guest, 0.85);
      ctx.stroke();
    }
    ctx.font = '500 9.5px "Figtree", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(232,230,245,0.72)';
    ctx.fillText('to scale: cell, bacterium', W - 10, H - 9);
  }

  // ---- genes

  layoutGenes() {
    const { W, H } = this;
    const g = this.geometry;
    const pad = 12;
    const top = 30;
    const bottom = W < 520 ? 104 : 92; // the host genome and the features
    const gw = W - 2 * pad;
    const gh = H - top - bottom - 6;
    const gap = 4;
    let pick = null;
    for (const p of [10, 9, 8, 7, 6, 5, 4, 3]) {
      const cols = Math.floor(gw / p);
      let rows = 0;
      for (const list of this.byKind) rows += Math.ceil(list.length / cols);
      const height = rows * p + gap * (this.byKind.length - 1);
      if (height <= gh) {
        pick = { p, cols, height };
        break;
      }
    }
    if (!pick) pick = { p: 3, cols: Math.floor(gw / 3), height: gh };
    const at = new Array(g.genes.length);
    let y = top;
    const blocks = [];
    for (let k = 0; k < this.byKind.length; k++) {
      const list = this.byKind[k];
      const y0 = y;
      list.forEach((gi, i) => {
        at[gi] = { x: pad + (i % pick.cols) * pick.p, y: y + Math.floor(i / pick.cols) * pick.p, kind: k };
      });
      y += Math.ceil(list.length / pick.cols) * pick.p + gap;
      blocks.push({ kind: k, y0, y1: y - gap });
    }
    this.grid = { at, p: pick.p, size: Math.max(2, pick.p - (pick.p >= 6 ? 1.5 : 1)), pad, top, bottomY: y, blocks, W, H };
  }

  drawGenes(now) {
    const ctx = this.ctx;
    const g = this.geometry;
    const h = this.h;
    if (!this.grid || this.grid.W !== this.W || this.grid.H !== this.H) this.layoutGenes();
    const grid = this.grid;
    const t = this.frame.typical;
    const kindKeys = g.kinds.map((k) => k.key);
    const bit = (arr, gi) => (arr[gi >>> 5] >>> (gi & 31)) & 1;
    // title
    ctx.font = '600 12px "Figtree", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(236,234,248,0.92)';
    const guests = h.ns > 0;
    ctx.fillText(guests ? `Guest genome: ${fmtInt(h.gs)} of 3,033 genes left` : 'Guest genome: no guests yet (the 3,033 genes of a free-living bacterium)', grid.pad, 19);
    // squares
    const s = grid.size;
    for (let gi = 0; gi < g.genes.length; gi++) {
      const sq = grid.at[gi];
      const col = COLORS[kindKeys[sq.kind]];
      const inSym = guests && bit(t.sym, gi);
      const inNuc = guests && bit(t.nuc, gi);
      if (!guests) {
        ctx.fillStyle = rgba(col, 0.22);
        ctx.fillRect(sq.x, sq.y, s, s);
      } else if (inSym) {
        ctx.fillStyle = rgba(col, 0.92);
        ctx.fillRect(sq.x, sq.y, s, s);
        if (inNuc && s >= 3) {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          const d = Math.max(1, s * 0.4);
          ctx.fillRect(sq.x + (s - d) / 2, sq.y + (s - d) / 2, d, d);
        }
      } else if (inNuc) {
        ctx.strokeStyle = rgba(col, 0.9);
        ctx.lineWidth = 1;
        ctx.strokeRect(sq.x + 0.5, sq.y + 0.5, s - 1, s - 1);
      } else {
        ctx.fillStyle = rgba(col, 0.07);
        ctx.fillRect(sq.x, sq.y, s, s);
      }
    }
    // the host genome
    const hostY = grid.bottomY + 8;
    const bar = this.hostBar(hostY);
    // genes on their way
    this.particles = this.particles.filter((q) => now - q.t < q.dur);
    for (const q of this.particles) {
      const k = (now - q.t) / q.dur;
      const col = COLORS[kindKeys[grid.at[q.g].kind]];
      if (q.kind === 'lose') {
        ctx.fillStyle = rgba([255, 255, 255], 0.8 * (1 - k));
        const d = s + 4 * k;
        ctx.fillRect(q.x + s / 2 - d / 2, q.y + s / 2 - d / 2, d, d);
      } else {
        const tx = bar.bactX + bar.bactW * hash(q.g, 5);
        const ty = bar.y + bar.h / 2;
        const e = k * k * (3 - 2 * k);
        const mx = (q.x + tx) / 2 + 30 * (hash(q.g, 6) - 0.5);
        const my = Math.min(q.y, ty) - 20;
        const x = (1 - e) * (1 - e) * q.x + 2 * (1 - e) * e * mx + e * e * tx;
        const y = (1 - e) * (1 - e) * q.y + 2 * (1 - e) * e * my + e * e * ty;
        ctx.fillStyle = rgba(col, 0.95);
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  hostBar(y) {
    const ctx = this.ctx;
    const { W } = this;
    const h = this.h;
    const pad = 12;
    const geneTotal = h.arch + h.bact + h.modGenes + h.extra + h.junk;
    const scale = Math.max(24000, geneTotal);
    const full = W - 2 * pad;
    ctx.font = '600 12px "Figtree", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(236,234,248,0.92)';
    ctx.fillText(`Host genome: ${fmtInt(h.gh)} genes`, pad, y + 10);
    ctx.textAlign = 'right';
    ctx.font = '500 10.5px "Figtree", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(236,234,248,0.66)';
    ctx.fillText(`bar: 0 to ${fmtInt(scale)}`, W - pad, y + 10);
    const by = y + 16;
    const bh = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(pad, by, full, bh);
    const parts = [
      ['arch', h.arch, 'archaeal'],
      ['guest', h.bact, 'from guests'],
      ['er', h.modGenes, 'features'],
      ['extra', h.extra, 'other new'],
      ['junk', h.junk, 'broken copies'],
    ];
    let x = pad;
    let bactX = pad;
    let bactW = 1;
    for (const [key, n, label] of parts) {
      const w = (n / scale) * full;
      ctx.fillStyle = rgba(COLORS[key], key === 'junk' ? 0.9 : 0.88);
      ctx.fillRect(x, by, Math.max(0, w), bh);
      if (key === 'guest') {
        bactX = x;
        bactW = Math.max(2, w);
      }
      x += w;
      void label;
    }
    // what each part is
    ctx.font = '500 10.5px "Figtree", system-ui, sans-serif';
    ctx.textAlign = 'left';
    let lx = pad;
    let ly = by + bh + 13;
    for (const [key, n, label] of parts) {
      const text = `${fmtInt(n)} ${label}`;
      const w = ctx.measureText(text).width + 22;
      if (lx + w > W - pad) {
        lx = pad;
        ly += 14;
      }
      ctx.fillStyle = rgba(COLORS[key], 1);
      ctx.fillRect(lx, ly - 8, 8, 8);
      ctx.fillStyle = 'rgba(236,234,248,0.8)';
      ctx.fillText(text, lx + 11, ly);
      lx += w;
    }
    // the eukaryotic features, as small gauges
    const fy = ly + 12;
    const n = MOD_LABELS.length;
    const fw = (W - 2 * pad) / n;
    ctx.font = '500 9.5px "Figtree", system-ui, sans-serif';
    for (let k = 0; k < n; k++) {
      const fx = pad + k * fw;
      const f = h.mods[k];
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(fx, fy, fw - 6, 4);
      const full = f >= 0.95; // a gene or two short works as well
      ctx.fillStyle = rgba(full ? COLORS.er : COLORS.extra, full ? 1 : 0.8);
      ctx.fillRect(fx, fy, (fw - 6) * f, 4);
      ctx.fillStyle = full ? 'rgba(244,242,255,0.95)' : 'rgba(236,234,248,0.6)';
      ctx.fillText(MOD_LABELS[k], fx, fy + 15);
    }
    return { y: by, h: bh, bactX, bactW };
  }

  // The gene under a point of the genes view, for tapping.
  geneAt(px, py) {
    if (this.view !== 'genes' || !this.grid || !this.geometry) return null;
    const { at, p } = this.grid;
    let best = null;
    let bd = (p * 0.9) ** 2;
    for (let gi = 0; gi < at.length; gi++) {
      const sq = at[gi];
      const dx = sq.x + p / 2 - px;
      const dy = sq.y + p / 2 - py;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = gi;
      }
    }
    if (best === null) return null;
    const [name, kind, tm, corr, prot] = this.geometry.genes[best];
    const t = this.frame?.typical;
    const bit = (arr) => (arr ? (arr[best >>> 5] >>> (best & 31)) & 1 : 0);
    const guests = this.h?.ns > 0;
    const inSym = guests && bit(t?.sym);
    const inNuc = guests && bit(t?.nuc);
    return { index: best, name, kind: this.geometry.kinds[kind], tm, corr, prot, inSym, inNuc, guests };
  }

  // ---- energy

  drawEnergy() {
    const ctx = this.ctx;
    const { W, H } = this;
    const h = this.h;
    const pad = 14;
    const full = W - 2 * pad;
    const text = (s, x, y, size = 11, weight = 500, color = 'rgba(236,234,248,0.85)', align = 'left') => {
      ctx.font = `${weight} ${size}px "Figtree", system-ui, sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = color;
      ctx.fillText(s, x, y);
    };
    const pct = (x) => `${x >= 0.095 ? Math.round(x * 100) : Math.round(x * 1000) / 10} %`;
    const roomy = H > 300;
    const barH = roomy ? 16 : 12;
    const ry = H - 58; // the ruler, above the help button
    const top = roomy ? 48 : 42;
    const rowGap = clamp((ry - 44 - top) / 3 + 8, 42, 96);
    text('A typical cell’s day, in ATP', pad, 20, 12.5, 700, 'rgba(244,242,255,0.95)');
    text(`divides every ${dayText(h.doubling)}`, W - pad, 20, 11.5, 500, 'rgba(236,234,248,0.75)', 'right');
    const food = Math.max(1, h.food);
    // a stacked bar with labels underneath
    const bar = (y, title, parts, scale, note) => {
      text(title, pad, y, 11.5, 700, 'rgba(244,242,255,0.92)');
      if (note) text(note, W - pad, y, 10.5, 500, 'rgba(236,234,248,0.68)', 'right');
      const by = y + 5;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(pad, by, full, barH);
      let x = pad;
      for (const p of parts) {
        const w = Math.max(0, (p.v / scale) * full);
        ctx.fillStyle = rgba(p.c, p.a ?? 0.9);
        ctx.fillRect(x, by, w, barH);
        if (p.hatch && w > 3) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, by, w, barH);
          ctx.clip();
          ctx.strokeStyle = 'rgba(5,6,12,0.55)';
          ctx.lineWidth = 1.4;
          for (let k = -barH; k < w; k += 5) {
            ctx.beginPath();
            ctx.moveTo(x + k, by + barH);
            ctx.lineTo(x + k + barH, by);
            ctx.stroke();
          }
          ctx.restore();
        }
        x += w;
      }
      // the labels, packed into lines
      ctx.font = '500 10.5px "Figtree", system-ui, sans-serif';
      let lx = pad;
      let ly = by + barH + 13;
      for (const p of parts) {
        if (!(p.v > 0) || !p.label) continue;
        const s = `${p.label} ${pct(p.v / scale)}`;
        const w = ctx.measureText(s).width + 20;
        if (lx + w > W - pad) {
          lx = pad;
          ly += 13;
        }
        ctx.fillStyle = rgba(p.c, 1);
        ctx.fillRect(lx, ly - 8, 7, 7);
        ctx.fillStyle = 'rgba(236,234,248,0.82)';
        ctx.textAlign = 'left';
        ctx.fillText(s, lx + 10, ly);
        lx += w;
      }
      return ly;
    };
    let y = top;
    // food
    let end = bar(
      y,
      'Food taken in',
      [
        { v: h.foodSurface, c: COLORS.arch, label: 'through the surface' },
        { v: h.foodEndo, c: COLORS.er, label: 'inner membranes' },
        { v: h.foodPhago, c: COLORS.guest, label: 'eaten whole' },
      ],
      food,
      `${sciText(h.food)} ATP if fully burnt`,
    );
    // ATP made
    const share = h.ns > 0 ? h.atpShare : 0;
    const unburnt = Math.max(0, food - h.ferm - h.resp);
    y = Math.max(end + 30, y + rowGap);
    end = bar(
      y,
      'ATP made',
      [
        { v: h.ferm, c: COLORS.arch, label: 'host ferments' },
        { v: share * h.resp, c: COLORS.mito, label: 'guests hand over' },
        { v: (1 - share) * h.resp, c: COLORS.mito, a: 0.5, hatch: true, label: 'guests keep' },
        { v: unburnt, c: COLORS.food, a: 0.35, label: 'not burnt' },
      ],
      food,
      h.ns > 0 ? `the host gets ${pct(share)} of its guests’ ATP` : 'no guests',
    );
    // where the host's ATP goes
    const raw = h.ferm + share * h.resp;
    const usable = h.hostPower;
    const lost = Math.max(0, raw - usable);
    const upCell = Math.max(0, h.upkeepHost - h.upkeepGenes);
    const growth = Number.isFinite(h.doubling) && h.doubling > 0 ? (Math.LN2 / h.doubling) * (h.buildHost / Math.LN2) : 0;
    const spare = Math.max(0, usable - h.upkeepHost - growth);
    const scale3 = Math.max(raw, upCell + h.upkeepGenes + growth + lost + spare, 1);
    y = Math.max(end + 30, y + rowGap);
    end = bar(
      y,
      'Where the host’s ATP goes',
      [
        { v: upCell, c: COLORS.extra, label: 'upkeep' },
        { v: h.upkeepGenes, c: COLORS.dna, label: `genes${h.copies > 1.05 ? ` (${h.copies < 10 ? h.copies.toFixed(1) : fmtInt(h.copies)} copies)` : ''}` },
        { v: lost, c: COLORS.food, a: 0.45, label: 'lost' },
        { v: growth, c: COLORS.guest, label: 'growth' },
        { v: spare, c: COLORS.mito, a: 0.35, hatch: true, label: 'held back by the guests' },
      ],
      scale3,
      null,
    );
    // power per gene, on a ruler of powers of ten
    this.ruler(Math.max(end + 40, ry), pad, full);
  }

  ruler(y, pad, full) {
    const ctx = this.ctx;
    const h = this.h;
    const lo = -3;
    const hi = 6;
    const X = (v) => pad + ((Math.log10(Math.max(v, 10 ** lo)) - lo) / (hi - lo)) * full;
    ctx.font = '700 11.5px "Figtree", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(244,242,255,0.92)';
    ctx.fillText('Power per gene, × the bacterium', pad, y - 14);
    // Lane and Martin's range for eukaryotes
    ctx.fillStyle = rgba(COLORS.mito, 0.18);
    ctx.fillRect(X(1e4), y - 8, X(1e5) - X(1e4), 16);
    ctx.strokeStyle = 'rgba(236,234,248,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y + 0.5);
    ctx.lineTo(pad + full, y + 0.5);
    ctx.stroke();
    ctx.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(236,234,248,0.6)';
    ctx.textAlign = 'center';
    for (let p = lo; p <= hi; p++) {
      const x = Math.round(X(10 ** p)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
      if (p % 3 === 0) ctx.fillText(p === 0 ? '1' : p === 3 ? '1,000' : `10${p < 0 ? '⁻³' : '⁶'}`, x, y + 14);
    }
    const mark = (v, label, col, up) => {
      const x = X(v);
      ctx.fillStyle = rgba(col, 1);
      ctx.beginPath();
      ctx.moveTo(x, y - 1);
      ctx.lineTo(x - 4, y - 8);
      ctx.lineTo(x + 4, y - 8);
      ctx.closePath();
      ctx.fill();
      if (label) {
        ctx.font = '600 10px "Figtree", system-ui, sans-serif';
        ctx.textAlign = x < pad + 40 ? 'left' : x > pad + full - 40 ? 'right' : 'center';
        ctx.fillText(label, x, up ? y - 11 : y - 11);
      }
    };
    if (this.first) mark(this.first.perGeneRel, '', COLORS.arch, true);
    mark(1, '', COLORS.guest, true);
    mark(h.perGeneRel, `this cell ×${numText(h.perGeneRel)}`, [255, 255, 255], true);
    ctx.font = '500 9.5px "Figtree", system-ui, sans-serif';
    ctx.fillStyle = rgba(COLORS.mito, 0.9);
    ctx.textAlign = 'center';
    ctx.fillText('eukaryotes', (X(1e4) + X(1e5)) / 2, y + 14);
  }
}

// a dark, rounded plate for text over the cells
function plate(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(5,6,12,0.8)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 5);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

// a capsule (rod) centred on the origin, long along x
function capsule(ctx, len, wid) {
  const r = wid / 2;
  const l = Math.max(0, len / 2 - r);
  ctx.beginPath();
  ctx.moveTo(-l, -r);
  ctx.lineTo(l, -r);
  ctx.arc(l, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-l, r);
  ctx.arc(-l, 0, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
}

function dayText(d) {
  if (!Number.isFinite(d)) return 'never';
  if (d >= 1) return `${d < 10 ? d.toFixed(1) : Math.round(d)} days`;
  return `${(d * 24).toFixed(d * 24 < 10 ? 1 : 0)} hours`;
}

function numText(x) {
  if (x >= 100) return fmtInt(Number(x.toPrecision(2)));
  if (x >= 1) return String(Number(x.toPrecision(2)));
  return String(Number(x.toPrecision(1)));
}

function sciText(x) {
  const p = Math.floor(Math.log10(x));
  const m = (x / 10 ** p).toFixed(1).replace(/\.0$/, '');
  const sup = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return `${m}×10${String(p).replace(/./g, (c) => sup[c] ?? c)}`;
}
