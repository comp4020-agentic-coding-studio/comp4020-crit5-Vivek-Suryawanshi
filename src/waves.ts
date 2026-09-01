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
   *
   * Wave 1 is the exception worth remembering: because its delay is measured
   * from the start of the run rather than from a previous arrival, it has a
   * hard floor of ORBIT_RADIUS / speed. Anything less and the wave would have
   * to spawn before the run began. The schedule builder throws on that.
   */
  arrivalDelay: number;
}

/** Top of the screen, where the eye lands first. */
export const PLAYER_START_ANGLE = -Math.PI / 2;

/**
 * Twelve waves, about twenty-three seconds if the player survives.
 *
 * It was eighteen. I kept dying at wave 13 or 14 no matter how I tuned the
 * waves around there, and three separate passes of widening gaps, slowing
 * speeds and adding a rest each moved the wall by exactly one wave. The
 * limit was never a wave's difficulty - it was how long I could keep
 * reacting without a break, and that turned out to be a bit over twenty
 * seconds.
 *
 * So the run ends before the wall instead of after it. Nothing here got
 * easier: every gap width, speed and delay is what it was. What I cut was
 * repetition - one flow wave, two anticipation waves, two pressure waves -
 * which was length rather than escalation. My pod plays this cold and once,
 * so it has to finish inside my limit, not at it.
 */
export const waves: Wave[] = [
  // DISCOVERY
  // 4.0s is 3.25s of flight time at speed 80 plus a moment of empty screen
  // first, so the player gets a beat with just the dot and the ring before
  // anything appears, and then watches the first wave the whole way in.
  {
    gapCentre: PLAYER_START_ANGLE,
    gapHalfWidth: Math.PI / 3,
    speed: 80,
    arrivalDelay: 4.0,
  },

  {
    gapCentre: -Math.PI / 4,
    gapHalfWidth: Math.PI / 3,
    speed: 85,
    arrivalDelay: 1.8,
  },

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
    arrivalDelay: 1.4,
  },

  // ANTICIPATION
  // Gaps tighten and arrivals get close enough that the next wave starts to
  // matter while you are still solving the current one.
  {
    gapCentre: (-3 * Math.PI) / 4,
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

  // THE BREATH
  // One slow, wide wave with a long wait after it. The player arrives at the
  // hard part with fresh hands instead of twenty seconds of fatigue.
  {
    gapCentre: (3 * Math.PI) / 4,
    gapHalfWidth: Math.PI / 4,
    speed: 75,
    arrivalDelay: 2.4,
  },

  // PRESSURE
  // One wave at full difficulty. Short because it needs to be, not soft.
  {
    gapCentre: 0,
    gapHalfWidth: Math.PI / 7,
    speed: 120,
    arrivalDelay: 1.0,
  },

  // STILLNESS
  // The pace drops. These last two share a gap centre, so a player who has
  // been conditioned to keep moving will move out of a gap they were already
  // standing in. Reading the game means noticing you are safe and staying.
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