// The run so far as stacked charts on one shared axis of generations, with
// real reference values drawn behind, and strips below showing when cells
// with guests took over and when each eukaryotic feature was finished.

// A tick label on a log axis, right-aligned at x: plain for 0.01 to 10,000,
// otherwise 10 with a raised power.
function logLabel(ctx, v, x, y, size) {
  const p = Math.round(Math.log10(v));
  if (p >= -2 && p <= 4) {
    ctx.fillText(v >= 1 ? Math.round(v).toLocaleString('en-US') : String(v), x, y);
    return;
  }
  const big = `${size}px "JetBrains Mono", ui-monospace, monospace`;
  const small = `${size - 2.5}px "JetBrains Mono", ui-monospace, monospace`;
  const e = String(p).replace('-', '−');
  ctx.font = small;
  const we = ctx.measureText(e).width;
  ctx.fillText(e, x, y - 4);
  ctx.font = big;
  ctx.fillText('10', x - we - 0.5, y);
}

export const PANELS = [
  {
    id: 'gs',
    title: 'Genes in the guest genome',
    log: true,
    min: 10,
    max: 4000,
    ticks: [10, 100, 1000],
    series: [{ key: 'gs', color: 'mito', width: 2, when: (q) => q.ns > 0 }],
    bands: [{ from: 10, to: 100, label: 'real mitochondria' }],
    hlines: [{ y: 600, label: 'Buchnera' }],
  },
  {
    id: 'gh',
    title: 'Genes in the host genome',
    min: 0,
    max: 20000,
    ticks: [0, 10000, 20000],
    series: [{ key: 'gh', color: 'dna', width: 2 }],
    bands: [{ from: 6000, to: 20000, label: 'free-living protists' }],
  },
  {
    id: 'V',
    title: 'Cell volume, µm³',
    log: true,
    min: 0.01,
    max: 1e5,
    ticks: [0.01, 1, 100, 1e4],
    series: [{ key: 'V', color: 'arch', width: 2 }],
    hlines: [{ y: 1, label: 'the bacterium' }],
  },
  {
    id: 'ppg',
    title: 'Power per gene, × the bacterium',
    log: true,
    min: 1e-3,
    max: 1e6,
    ticks: [1e-3, 1, 1e3, 1e6],
    series: [{ key: 'perGeneRel', color: 'mito', width: 2 }],
    bands: [{ from: 1e4, to: 1e5, label: 'eukaryotes (Lane & Martin)' }],
    hlines: [{ y: 1, label: 'bacterium' }],
  },
  {
    id: 'dbl',
    title: 'Divides every, days',
    log: true,
    min: 0.1,
    max: 50,
    ticks: [0.1, 1, 10],
    series: [{ key: 'doubling', color: 'ink', width: 1.8 }],
    bands: [{ from: 14, to: 25, label: 'Imachi’s archaeon' }],
  },
];

export const STRIPS = [
  { label: 'Guests', value: (q) => q.share, color: 'guest' },
  { label: 'Import', value: (q) => q.mods[0], color: 'feature' },
  { label: 'Carrier', value: (q) => q.mods[1], color: 'feature' },
  { label: 'Nucleus', value: (q) => q.mods[2], color: 'feature' },
  { label: 'ER', value: (q) => q.mods[3], color: 'feature' },
  { label: 'Skeleton', value: (q) => q.mods[4], color: 'feature' },
  { label: 'Eating', value: (q) => q.mods[5], color: 'feature' },
  { label: 'Sex', value: (q) => q.mods[6], color: 'feature' },
];

const PAD = { left: 52, right: 10, title: 17, gap: 8, strip: 8, stripGap: 2, axis: 22 };

export class Charts {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = [];
    this.end = 300000;
    this.cursor = null;
    this.W = 0;
    this.H = 0;
  }

  setRange(end) {
    this.end = end;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = PANELS.length;
    const strips = STRIPS.length * (PAD.strip + PAD.stripGap) + 10;
    const row = (this.H - strips - PAD.axis) / n;
    const ph = row - PAD.title - PAD.gap;
    this.boxes = PANELS.map((p, i) => ({ panel: p, y: i * row + PAD.title, h: ph }));
    this.stripY = n * row + 4;
  }

  x(gen) {
    return PAD.left + (gen / this.end) * (this.W - PAD.left - PAD.right);
  }

  genAt(x) {
    const t = (x - PAD.left) / (this.W - PAD.left - PAD.right);
    return Math.min(1, Math.max(0, t)) * this.end;
  }

  // nearest point to a generation
  pointAt(gen) {
    const P = this.points;
    if (!P.length) return null;
    const step = P.length > 1 ? P[1].gen - P[0].gen || 100 : 100;
    const i = Math.round((gen - P[0].gen) / step);
    return P[Math.min(P.length - 1, Math.max(0, i))];
  }

  draw(colors) {
    const ctx = this.ctx;
    const { W, H } = this;
    if (!this.boxes) return;
    ctx.clearRect(0, 0, W, H);
    const P = this.points;
    const x0 = PAD.left;
    const x1 = W - PAD.right;
    const font = (s, w = 400) => `${w} ${s}px "Figtree", system-ui, sans-serif`;
    const mono = (s) => `${s}px "JetBrains Mono", ui-monospace, monospace`;

    for (const box of this.boxes) {
      const p = box.panel;
      const yOf = (v) => {
        const t = p.log ? (Math.log10(Math.max(v, p.min)) - Math.log10(p.min)) / (Math.log10(p.max) - Math.log10(p.min)) : (v - p.min) / (p.max - p.min);
        return box.y + box.h - Math.min(1, Math.max(0, t)) * box.h;
      };
      ctx.fillStyle = colors.plot;
      ctx.fillRect(x0, box.y, x1 - x0, box.h);
      // what real cells say, behind everything
      for (const b of p.bands ?? []) {
        const top = yOf(Math.min(b.to, p.max));
        const bottom = yOf(Math.max(b.from, p.min));
        ctx.fillStyle = colors.ref;
        ctx.fillRect(x0, top, x1 - x0, bottom - top);
        ctx.fillStyle = colors.ink3;
        ctx.font = font(9.5);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(b.label, x1 - 4, top + 2);
      }
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.font = mono(9.5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const t of p.ticks) {
        const y = Math.round(yOf(t)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.fillStyle = colors.ink3;
        if (p.log) logLabel(ctx, t, x0 - 5, y, 9.5);
        else ctx.fillText(t.toLocaleString('en-US'), x0 - 5, y);
      }
      for (const l of p.hlines ?? []) {
        const y = Math.round(yOf(l.y)) + 0.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = colors.ink3;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = colors.ink3;
        ctx.font = font(9.5);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(l.label, x0 + 4, y - 1);
      }
      // the run
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, box.y, x1 - x0, box.h);
      ctx.clip();
      for (const s of p.series) {
        if (!P.length) continue;
        ctx.beginPath();
        let px = -1;
        let pen = false;
        P.forEach((q, i) => {
          const ok = (!s.when || s.when(q)) && Number.isFinite(q[s.key]);
          if (!ok) {
            pen = false;
            return;
          }
          const X = this.x(q.gen);
          if (pen && X - px < 0.5 && i < P.length - 1) return;
          px = X;
          const Y = yOf(q[s.key]);
          if (!pen) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
          pen = true;
        });
        ctx.strokeStyle = colors[s.color];
        ctx.lineWidth = s.width ?? 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.restore();
      ctx.font = font(11.5, 700);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = colors.ink2;
      ctx.fillText(p.title, x0, box.y - 5);
    }

    // the strips: how complete each feature is in the typical cell
    let sy = this.stripY;
    for (const s of STRIPS) {
      ctx.fillStyle = colors.plot;
      ctx.fillRect(x0, sy, x1 - x0, PAD.strip);
      const col = colors[s.color];
      let px = -1;
      for (let i = 0; i < P.length; i++) {
        const q = P[i];
        const X = this.x(q.gen);
        if (X - px < 1 && i < P.length - 1) continue;
        const v = s.value(q);
        if (v > 0.01) {
          ctx.globalAlpha = v >= 0.95 ? 1 : 0.15 + 0.5 * v;
          ctx.fillStyle = col;
          const nx = i < P.length - 1 ? this.x(P[i + 1].gen) : X + 1;
          ctx.fillRect(X, sy, Math.max(1, nx - X + 0.5), PAD.strip);
        }
        px = X;
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.ink3;
      ctx.font = font(9.5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, x0 - 5, sy + PAD.strip / 2);
      sy += PAD.strip + PAD.stripGap;
    }

    // the axis of generations
    const ay = sy + 4;
    ctx.strokeStyle = colors.ink3;
    ctx.fillStyle = colors.ink3;
    ctx.font = mono(10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const every = W < 560 ? 100000 : 50000;
    for (let g = 0; g <= this.end; g += 25000) {
      const X = Math.round(this.x(g)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(X, ay - 4);
      ctx.lineTo(X, ay);
      ctx.stroke();
      if (g > 0 && g % every === 0) {
        const t = `${g / 1000}k`;
        ctx.fillText(t, Math.min(X, W - 1 - ctx.measureText(t).width / 2), ay + 2);
      }
    }
    // the axis's name where its zero would be
    ctx.textAlign = 'right';
    ctx.font = font(9.5);
    ctx.fillText('generations', x0 + 3, ay + 2);

    // now, and the cursor
    const bottom = sy - PAD.stripGap;
    if (P.length) {
      const X = Math.round(this.x(P[P.length - 1].gen)) + 0.5;
      ctx.strokeStyle = colors.ink2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(X, this.boxes[0].y);
      ctx.lineTo(X, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.cursor !== null && P.length) {
      const X = Math.round(this.x(this.cursor)) + 0.5;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, this.boxes[0].y);
      ctx.lineTo(X, bottom);
      ctx.stroke();
    }
  }
}
