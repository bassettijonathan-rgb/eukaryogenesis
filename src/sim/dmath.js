// Deterministic maths. Math.exp, Math.log, Math.pow and Math.cbrt may round
// their last digit differently from one browser to the next, and in a run
// of chance events one different digit is enough to send a run down another
// path. These versions use only + − × ÷ and Math.sqrt, which every engine
// rounds the same way, so the same seed gives the same run everywhere.

export const LN2 = 0.6931471805599453;
const SQRT2 = 1.4142135623730951;

// 2^k for integer k, exactly
function pow2(k) {
  let r = 1;
  if (k > 0) for (let i = 0; i < k; i++) r *= 2;
  else for (let i = 0; i < -k; i++) r *= 0.5;
  return r;
}

export function dexp(x) {
  if (x !== x) return NaN;
  if (x > 709) return Infinity;
  if (x < -745) return 0;
  // x = k ln2 + r with |r| <= ln2 / 2
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  // Taylor series; |r| < 0.35 so 18 terms reach full precision
  let term = 1;
  let sum = 1;
  for (let n = 1; n < 18; n++) {
    term = (term * r) / n;
    sum += term;
  }
  // split the power of two so neither factor under- or overflows
  const k1 = Math.trunc(k / 2);
  return sum * pow2(k1) * pow2(k - k1);
}

export function dlog(x) {
  if (!(x > 0)) return x === 0 ? -Infinity : NaN;
  if (x === Infinity) return Infinity;
  // x = m * 2^e with m in [sqrt(1/2), sqrt(2))
  let e = 0;
  let m = x;
  while (m >= SQRT2) {
    m *= 0.5;
    e++;
  }
  while (m < SQRT2 / 2) {
    m *= 2;
    e--;
  }
  // log m = 2 atanh(z), z = (m − 1)/(m + 1), |z| < 0.172
  const z = (m - 1) / (m + 1);
  const z2 = z * z;
  let term = z;
  let sum = z;
  for (let n = 3; n < 40; n += 2) {
    term *= z2;
    sum += term / n;
  }
  return 2 * sum + e * LN2;
}

export const dpow = (x, y) => (x === 0 ? 0 : dexp(y * dlog(x)));
export const dlog10 = (x) => dlog(x) / 2.302585092994046;

export function dcbrt(x) {
  if (x === 0) return 0;
  const s = x < 0 ? -1 : 1;
  const a = x * s;
  let y = dexp(dlog(a) / 3);
  // two Newton steps make the last digits independent of the start
  y = y - (y * y * y - a) / (3 * y * y);
  y = y - (y * y * y - a) / (3 * y * y);
  return s * y;
}
