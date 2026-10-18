// Seeded random numbers (sfc32). The same seed gives the same stream on
// every run, which is what makes a whole simulation reproducible. The
// distributions use the deterministic maths in dmath.js.

import { dexp, dlog } from './dmath.js';

function hash32(seed) {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed = 1) {
    const h = hash32(seed);
    this.a = h;
    this.b = (h ^ 0x9e3779b9) >>> 0;
    this.c = (h ^ 0x243f6a88) >>> 0;
    this.d = 1;
    this.spare = null;
    for (let i = 0; i < 16; i++) this.u32();
  }

  u32() {
    let { a, b, c, d } = this;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    return t >>> 0;
  }

  float() {
    return this.u32() / 4294967296;
  }

  int(n) {
    return Math.floor(this.float() * n);
  }

  chance(p) {
    return this.float() < p;
  }

  // standard normal, Marsaglia's polar method
  normal() {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    let u;
    let v;
    let s;
    do {
      u = 2 * this.float() - 1;
      v = 2 * this.float() - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const f = Math.sqrt((-2 * dlog(s)) / s);
    this.spare = v * f;
    return u * f;
  }

  poisson(mean) {
    if (mean <= 0) return 0;
    if (mean < 30) {
      const L = dexp(-mean);
      let k = 0;
      let p = this.float();
      while (p > L) {
        k++;
        p *= this.float();
      }
      return k;
    }
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * this.normal()));
  }

  // successes in n trials of probability p
  binomial(n, p) {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n <= 40) {
      let k = 0;
      for (let i = 0; i < n; i++) if (this.float() < p) k++;
      return k;
    }
    const mean = n * p;
    if (mean < 20 || n * (1 - p) < 20) {
      if (p > 0.5) return n - this.binomial(n, 1 - p);
      return Math.min(n, this.poisson(mean));
    }
    const sd = Math.sqrt(mean * (1 - p));
    return Math.max(0, Math.min(n, Math.round(mean + sd * this.normal())));
  }

  // 1, 2, 3 … with the given mean
  geometric(mean) {
    if (mean <= 1) return 1;
    const p = 1 / mean;
    return 1 + Math.floor(dlog(1 - this.float()) / dlog(1 - p));
  }
}
