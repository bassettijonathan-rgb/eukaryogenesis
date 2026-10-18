// Numbers for people: thousands separators, a real minus sign, powers of
// ten with <sup> where a number gets huge, durations in days or hours.

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const sup = (n) => String(n).replace(/./g, (c) => SUP[c] ?? c);
const minus = (s) => s.replace(/^-/, '−');

export function sci(x, digits = 1, html = false) {
  if (!Number.isFinite(x)) return '–';
  if (x === 0) return '0';
  let p = Math.floor(Math.log10(Math.abs(x)));
  let m = (x / 10 ** p).toFixed(digits);
  if (Math.abs(Number(m)) >= 10) {
    p += 1;
    m = (x / 10 ** p).toFixed(digits);
  }
  m = m.replace(/\.0+$/, '');
  return minus(html ? `${m}×10<sup>${minus(String(p))}</sup>` : `${m}×10${sup(p)}`);
}

// Two significant figures by default, scientific notation when tiny or huge.
export function num(x, sig = 2, html = false) {
  if (!Number.isFinite(x)) return '–';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e7 || a < 1e-3) return sci(x, 1, html);
  const p = Math.floor(Math.log10(a));
  const r = Number(x.toPrecision(sig));
  return minus(r.toLocaleString('en-US', { maximumFractionDigits: Math.max(0, sig - 1 - p) }));
}

// A whole number with thousands separators.
export const int = (x) => (Number.isFinite(x) ? minus(Math.round(x).toLocaleString('en-US')) : '–');

// How many times something is: "×8,000", "×0.01".
export const times = (x, html = false) => `×${num(x, 2, html)}`;

// A volume in µm³.
export const vol = (v, html = false) => `${num(v, 2, html)} µm³`;

// The width of a round cell of that volume, in µm.
export const across = (v) => Math.cbrt((6 * v) / Math.PI);
export const width = (v) => {
  const d = across(v);
  return `${num(d, d < 10 ? 2 : 2)} µm`;
};

// A doubling time given in days.
export function dur(days) {
  if (!Number.isFinite(days)) return 'never';
  if (days >= 2) return `${num(days, 2)} days`;
  if (days >= 1) return `${num(days, 2)} day${days >= 1.05 ? 's' : ''}`;
  const h = days * 24;
  if (h >= 1) return `${num(h, 2)} hours`;
  return `${num(h * 60, 2)} minutes`;
}

export const pct = (x) => `${num(x * 100, 2)} %`;

// Generations, rounded to the step.
export const gen = (g) => int(g);

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
