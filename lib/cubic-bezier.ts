/**
 * Standard 4-sample-table + Newton-Raphson cubic-bezier solver (the same
 * algorithm browsers themselves use for CSS `cubic-bezier()` timing
 * functions — ported from the widely-used gre/bezier-easing reference
 * implementation). Needed because this project drives easing from a
 * scroll-linked progress value in JS (testimonies-section.tsx), not a
 * CSS transition/animation, so there's no way to hand the easing curve
 * to the browser directly — `getTForX` inverts x(t) to find t for a
 * given progress x, then evaluates y(t) for the eased output.
 */
export function cubicBezier(mX1: number, mY1: number, mX2: number, mY2: number): (x: number) => number {
  if (mX1 === mY1 && mX2 === mY2) return (x) => x;

  const A = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const B = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const C = (a1: number) => 3 * a1;
  const calcBezier = (t: number, a1: number, a2: number) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  const getSlope = (t: number, a1: number, a2: number) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);

  function binarySubdivide(x: number, startT: number, endT: number) {
    let a = startT;
    let b = endT;
    let currentX = 0;
    let currentT = 0;
    let i = 0;
    do {
      currentT = a + (b - a) / 2;
      currentX = calcBezier(currentT, mX1, mX2) - x;
      if (currentX > 0) b = currentT;
      else a = currentT;
      i += 1;
    } while (Math.abs(currentX) > 1e-7 && i < 10);
    return currentT;
  }

  function newtonRaphsonIterate(x: number, guessT: number) {
    let t = guessT;
    for (let i = 0; i < 4; i += 1) {
      const slope = getSlope(t, mX1, mX2);
      if (slope === 0) return t;
      const currentX = calcBezier(t, mX1, mX2) - x;
      t -= currentX / slope;
    }
    return t;
  }

  const SAMPLES = 11;
  const STEP = 1 / (SAMPLES - 1);
  const sampleValues = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i += 1) sampleValues[i] = calcBezier(i * STEP, mX1, mX2);

  function getTForX(x: number) {
    let intervalStart = 0;
    let currentSample = 1;
    const lastSample = SAMPLES - 1;
    for (; currentSample !== lastSample && sampleValues[currentSample] <= x; currentSample += 1) {
      intervalStart += STEP;
    }
    currentSample -= 1;
    const dist = (x - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample] || 1);
    const guessForT = intervalStart + dist * STEP;
    const initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= 0.001) return newtonRaphsonIterate(x, guessForT);
    if (initialSlope === 0) return guessForT;
    return binarySubdivide(x, intervalStart, intervalStart + STEP);
  }

  return function ease(x: number) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return calcBezier(getTForX(x), mY1, mY2);
  };
}
