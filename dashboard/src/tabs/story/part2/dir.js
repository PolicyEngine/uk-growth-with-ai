// Direction from a value's sign, for part 2's arrows: the concept to draw
// (gapUp, gapDown, onPath) and the words that go with it, so an icon never
// says more than the sentence beside it. `eps` is half the last printed
// digit of the figure the direction describes (two decimals by default).
export const EPS2 = 0.005;

export function dirConcept(x, eps = EPS2) {
  if (x == null || !Number.isFinite(x)) return null;
  return Math.abs(x) < eps ? 'onPath' : x > 0 ? 'gapUp' : 'gapDown';
}

export function dirWord(x, eps = EPS2) {
  const c = dirConcept(x, eps);
  return c === 'gapUp' ? 'above' : c === 'gapDown' ? 'below' : c === 'onPath' ? 'on' : null;
}
