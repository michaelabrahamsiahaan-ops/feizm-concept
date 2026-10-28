// Shared between HomeHeroParallax and HomeCompany: how much EXTRA scroll
// the hero's pin holds its final frame for, after its own 5-scene story
// ends, while HomeCompany slides up over it like a curtain. A single
// shared constant so the two components' CSS values can't drift apart —
// see HomeHeroParallax's own doc comment for the full mechanism (why the
// hero's wrapper is extended by exactly this much, and why HomeCompany's
// `margin-top` is the same value, negated).
export const OVERLAP_VH = 100;
