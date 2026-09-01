/**
 * A run of Stillpoint is this list. Nothing generates it, and nothing about
 * it is random, so every player gets the same game and the difficulty curve
 * is data I can retune rather than a formula I have to reason about.
 */

export interface Wave {
  /** Angle the gap is centred on, in radians. */
  gapCentre: number;
  /** Half the gap's angular width, in radians. Larger is easier. */
  gapHalfWidth: number;
  /** How fast the wave expands, in units per second. Visual character. */
  speed: number;
  /**
   * Seconds between the previous wave arriving at the player's orbit and this
   * one arriving. For the first wave, seconds from the start of the run.
   *
   * This is arrival-to-arrival, not spawn-to-spawn, because what matters is
   * how much decision time the player gets. Spawn times are derived from it
   * (arrival time minus radius / speed), which means a slow wave following a
   * short delay can need to spawn before the previous wave arrived. Waves
   * overlapping in flight is intended: it is what makes the anticipation
   * section work.
   */
  arrivalDelay: number;
}

/** Top of the screen, where the eye lands first. */
export const PLAYER_START_ANGLE = -Math.PI / 2;

export const waves: Wave[] = [
  // DISCOVERY
  // Wave 1's gap is centred exactly on the start angle, so the player lives
  // without doing anything. This is the wave that teaches "the hole is the
  // safe part" before the game asks for anything. The two seconds before it
  // arrives are the window where a stranger moves the pointer and discovers
  // that the point follows it.
  {
    gapCentre: PLAYER_START_ANGLE,
    gapHalfWidth: Math.PI / 3,
    speed: 80,
    arrivalDelay: 2.0,
  },

  // Gap offset slightly. A nudge is enough.
  {
    gapCentre: -Math.PI / 4,
    gapHalfWidth: Math.PI / 3,
    speed: 85,
    arrivalDelay: 1.8,
  },

  // First move that has to be deliberate.
  {
    gapCentre: 0,
    gapHalfWidth: (5 * Math.PI) / 18,
    speed: 90,
    arrivalDelay: 1.7,
  },

  // FLOW
  // Move, wait, adjust, move. Should feel smooth rather than frantic.
  {
    gapCentre: Math.PI / 4,
    gapHalfWidth: Math.PI / 4,
    speed: 95,
    arrivalDelay: 1.6,
  },

  {
    gapCentre: Math.PI / 2,
    gapHalfWidth: Math.PI / 4,
    speed: 100,
    arrivalDelay: 1.5,
  },

  {
    gapCentre: Math.PI,
    gapHalfWidth: (2 * Math.PI) / 9,
    speed: 105,
    arrivalDelay: 1.5,
  },

  {
    gapCentre: (-3 * Math.PI) / 4,
    gapHalfWidth: (2 * Math.PI) / 9,
    speed: 110,
    arrivalDelay: 1.4,
  },

  // ANTICIPATION
  // Gaps tighten and arrivals get close enough that the next wave starts to
  // matter while you are still solving the current one.
  {
    gapCentre: -Math.PI / 4,
    gapHalfWidth: Math.PI / 6,
    speed: 115,
    arrivalDelay: 1.25,
  },

  {
    gapCentre: Math.PI / 4,
    gapHalfWidth: Math.PI / 6,
    speed: 115,
    arrivalDelay: 1.15,
  },

  {
    gapCentre: Math.PI / 2,
    gapHalfWidth: (5 * Math.PI) / 36,
    speed: 120,
    arrivalDelay: 1.1,
  },

  {
    gapCentre: (3 * Math.PI) / 4,
    gapHalfWidth: (5 * Math.PI) / 36,
    speed: 120,
    arrivalDelay: 1.05,
  },

  {
    gapCentre: Math.PI,
    gapHalfWidth: (5 * Math.PI) / 36,
    speed: 125,
    arrivalDelay: 1.0,
  },

  // PRESSURE
  // Bigger positional changes, less recovery time. Same one control.
  {
    gapCentre: 0,
    gapHalfWidth: Math.PI / 9,
    speed: 130,
    arrivalDelay: 0.95,
  },

  {
    gapCentre: (3 * Math.PI) / 4,
    gapHalfWidth: Math.PI / 9,
    speed: 135,
    arrivalDelay: 0.9,
  },

  {
    gapCentre: -Math.PI / 2,
    gapHalfWidth: Math.PI / 9,
    speed: 140,
    arrivalDelay: 0.85,
  },

  {
    gapCentre: Math.PI / 2,
    gapHalfWidth: Math.PI / 10,
    speed: 140,
    arrivalDelay: 0.85,
  },

  // STILLNESS
  // The pace drops. These last two share a gap centre, so a player who has
  // been conditioned to keep moving will move out of a gap they were already
  // standing in. Reading the game means recognising you are safe and staying.
  {
    gapCentre: -Math.PI / 4,
    gapHalfWidth: Math.PI / 8,
    speed: 90,
    arrivalDelay: 2.2,
  },

  {
    gapCentre: -Math.PI / 4,
    gapHalfWidth: Math.PI / 12,
    speed: 65,
    arrivalDelay: 2.8,
  },
];
