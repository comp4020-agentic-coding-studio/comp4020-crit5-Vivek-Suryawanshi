/**
 * The whole collision model of Stillpoint is angles. The player has one piece
 * of state: an angle around the centre. A wave is solid everywhere except an
 * arc, described by the angle its gap is centred on and the gap's half-width.
 *
 * Nothing in here touches the DOM, a canvas or a clock, so it can be tested
 * on its own.
 */

/**
 * The shortest distance between two angles, going whichever way round the
 * circle is shorter. Always returns a value in [0, PI].
 *
 * Accepts any real number, including the negative values atan2 produces for
 * the lower half of the screen, and angles outside [0, 2PI). That means
 * callers never have to remember to normalise an angle first.
 */
export function angularDistance(a: number, b: number): number {
  const twoPi = 2 * Math.PI;
  const difference = a - b;

  // Shift by PI, take a true modulo into [0, 2PI), then shift back, which
  // lands the result in [-PI, PI). JavaScript's % is a remainder rather than
  // a modulo and goes negative for negative operands, so the (x % m + m) % m
  // form is doing real work here.
  const normalised = ((((difference + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;

  return Math.abs(normalised);
}

/**
 * The rule of the game: when a wave reaches the player's orbit, the player
 * lives if they are inside that wave's gap.
 *
 * The boundary counts as safe. A player standing exactly on the edge of the
 * gap survives.
 */
export function isSafe(
  playerAngle: number,
  gapCentre: number,
  gapHalfWidth: number,
): boolean {
  return angularDistance(playerAngle, gapCentre) <= gapHalfWidth;
}
