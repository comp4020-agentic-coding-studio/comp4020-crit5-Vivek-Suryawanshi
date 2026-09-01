# Process overview

## What I built

Stillpoint is a browser game with one control. A dot sits on a circular orbit
around the centre of the screen, waves expand outward toward it, and each wave
is solid except for one gap. Move into the gap before the wave reaches you or
the round ends. The pointer's angle around the centre is the player's angle, and
nothing else is an input. There are no instructions anywhere, so the opening
screen has to do the teaching: one dot, one ring, one thing coming toward you
with a visible hole in it. Twelve authored waves, about twenty-three seconds if
you survive, ending with two waves that share a gap centre so the last thing the
game asks is that you notice you are already safe and stay still.

## The moments that mattered

### 1. My tests caught the loud bug and missed the real one

The collision rule reduces to comparing an angular distance against a gap's
half-width, so the whole game rests on one function that has to handle angles
wrapping around zero. I wrote it, wrote seven cases for it, and they passed.

The obvious next step was to move on. Instead I broke the function on purpose,
twice. Dropping the second modulo failed nine of fourteen cases, which told me
the tests were exercising that line. Then I dropped the `+ twoPi` guard, which
is the bug you actually get if you forget that JavaScript's `%` is a remainder
rather than a modulo --- and every test passed. My cases only ever checked
wraparound in one argument order, so `a - b` never went below `-pi`, which is
the only place that bug bites.

I knew the fix was right because I applied it while the code was still broken
and watched the two new assertions fail before restoring the function. A test I
have never seen fail is not evidence of anything. The correction landed in the
test file rather than in the code, which is where it is worth having.

[`903d1fb`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Vivek-Suryawanshi/commit/903d1fb)

### 2. I could not finish my own game

I designed eighteen waves in five stages and was confident about the curve.
Playing it, I died at wave 12. The obvious move was to soften the wave I kept
dying on, so I did: I widened the gaps, pulled the speeds back, cut a wave. My
best run went to 13. I added a rest before the hard section. My best run went to
14. Three passes, three tuning sessions, one wave each.

At that point the pattern was the finding. The wall was not any wave's
difficulty --- it was about twenty-two seconds of unbroken reaction before my
hands gave out, and no amount of softening individual waves moves that. So I
stopped making it easier and made it shorter: twelve waves, ending before the
wall instead of after it, with every gap width, speed and delay left exactly as
it was. What I cut was repetition rather than escalation.

The check was playing it again, and reaching the end for the first time. It also
confirmed the ending works --- the last two waves share a gap centre, and I held
position instead of moving out of a gap I was already standing in. My pod plays
this cold and once, so the run has to finish inside my limit, not at it.

[`d53a566`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Vivek-Suryawanshi/commit/d53a566)

### 3. Playing showed me two things reading never would

Once the game was finished I played a full run and could not tell how far
through it I was, and a win looked exactly like a loss --- both ended in
silence. Neither is a bug. Nothing was broken, and no test could have been
written for either.

The obvious fix was text: a wave counter, or the word "complete". That would
have broken the no-tutorial rule for the sake of feedback. Instead the centre of
the screen grows one short spoke per wave survived, grey during play, white and
heavier when the set completes. Progress and ending, no words.

I checked it by playing a full run to the end and asking myself the same two
questions. I could feel the run advancing, and a completed star reads as
different from a run that stopped at four. I also found it pulled my eye toward
the centre, which is where waves come from, so it needed to be quieter than my
first attempt.

[`6f4c4b9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Vivek-Suryawanshi/commit/6f4c4b9)

### 4. A green check that was checking nothing

`pnpm check` passed on my machine every time I ran it. Then I looked at
`git status` and found `src/config.ts` untracked and `index.html` and
`styles.css` modified but never committed --- three files the game does not run
without. The local check was green because the files were on my disk, which says
nothing about what is in the repo.

The obvious response was to commit them and move on. What I did instead was add
the check that would have caught it: clone the repo fresh into a temporary
directory, install, and build there. It went green, which is the first evidence
I had that what is on GitHub is the game rather than my laptop being the game.

The same shape showed up with the agent, which reported that it had used
eighteen waves from `waves.length` while the file it claimed to have read
contained twelve. `grep -c` settled it in a second. Both are the same lesson:
verify against the artefact, not against the report.

[`0bf218d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Vivek-Suryawanshi/commit/0bf218d)
