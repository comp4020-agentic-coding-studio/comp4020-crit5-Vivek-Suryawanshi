# Stillpoint — design spec

I wrote this before building anything, so that the decisions were made by me
rather than discovered by an agent. It is the thing I check the build against.

## What the game is

A small glowing point sits on a circular orbit around the centre of the screen.
Waves expand outward from the centre toward that orbit. Each wave is solid
except for one gap. If the solid part of a wave reaches the player, the round
ends. If the gap does, the player passes through.

The whole rule is: move into the gap before the wave reaches you.

There is one control. The player's point follows the pointer around the circle.
There is nothing else to learn.

## How it teaches itself

There are no instructions anywhere — no modal, no text on screen, nothing in
the README standing in for one. The opening screen has to do the teaching.

The first frame shows a point, the ring it sits on, and something expanding
toward it with a visible hole in it. I think that is legible without words,
because there is only one moving thing and only one place it could safely be.

The first wave's gap is centred exactly on the player's starting angle, and it
arrives two seconds after the run begins. So the player survives it whether or
not they do anything. Those two seconds are where a stranger moves the mouse
and finds out the point follows it. That is the most important number in the
whole wave list: it is the window where experimenting is free.

The second wave's gap is offset slightly, so a nudge is enough. The third needs
a real move. After that the game stops teaching and starts asking.

## The model: everything is an angle

The player's state is a single angle. Not an x and a y. A wave is three
numbers — its current radius, the angle its gap is centred on, and the gap's
half-width — and it is solid everywhere outside that arc.

That reduces the collision rule to one comparison. When a wave's radius reaches
the orbit radius, the player lives if the angular distance between their angle
and the gap's centre is no more than the half-width. No intersecting circles,
no per-pixel checks.

Two things fall out of it. Pointer input is just `atan2(y - cy, x - cx)`, and I
throw the distance away, so the pointer can be anywhere on screen and it still
works — and the same line handles touch, which matters at the narrow marking
viewport. And the only subtlety in the game is that angles wrap, so 350 degrees
and 10 degrees are 20 degrees apart, not 340. Every bug the core rule could
have lives in that one line, which is why it is the line I test.

## The wave list is authored data, not a generator

A run is a hand-written list of waves. Each entry has a gap centre, a gap
half-width, a speed, and an arrival delay.

I chose this over generating waves procedurally for four reasons:

- a stranger is guaranteed to reach an ending, because the list ends;
- the difficulty curve is data I retune in seconds, not a formula I have to
  reason about;
- every person in my pod plays exactly the same game, so their reactions are
  comparable;
- it is deterministic, so it can be tested.

### arrivalDelay, not spawn delay

I originally wrote this field as the delay between waves spawning. That is the
wrong quantity. What the player actually experiences is the time between waves
*arriving* at the orbit, and because the waves get faster as the run goes on,
a faster wave spends less time in flight and arrives sooner after spawning than
the slow one before it did. Spawn-to-spawn delays would quietly compress the
reaction time at exactly the point in the run where I least want a surprise,
and then invert at the stillness section where the speed drops again.

So `arrivalDelay` means: seconds between the previous wave arriving and this
one arriving. The implementation derives the spawn time from it, as arrival
time minus radius divided by speed. Now every number in that column says how
much decision time the player gets, independently of what came before, and
`speed` becomes purely an expressiveness dial — how urgent a wave looks and how
far ahead it is visible.

One consequence to watch: a slow wave after a short delay can need to spawn
before the previous wave arrived, or in principle before the run starts. Waves
overlapping in flight is intended, since that is what the anticipation section
depends on. A negative spawn time is not, so I assert against it during
development rather than letting a bad row show up as a wave that never appears.

## The shape of a run

Roughly eighteen waves, about one to two minutes if the player survives, so
someone can reach an ending well inside five minutes and still have time to try
again.

- **Discovery** — huge gaps, slow waves, the first one free.
- **Flow** — a rhythm of move, wait, adjust, move. Smooth, not frantic.
- **Anticipation** — gaps tighten and arrivals get close enough that where I
  finish this movement decides how hard the next one is.
- **Pressure** — bigger positional changes, less recovery time.
- **Stillness** — the pace drops. The final two waves share a gap centre, so a
  player conditioned by the pressure section will move out of a gap they were
  already standing in. Reading the game means noticing you are safe and staying
  there.

That last section is why the game is called Stillpoint. The difficulty never
comes from more controls; it comes from understanding the one control better.

## Winning and losing

Losing is a collision, and it should read without a big red word: the point
fades or fragments, and the run resets on its own without a menu.

Winning is shown by the centre. A small form there gains one element per wave
survived, and completes when the last wave passes. Then the waves stop and the
screen goes quiet. I am deliberately keeping this cheap — a polygon gaining a
side, not an evolving flower — because it is the part of the design most likely
to eat a day and produce something the pod does not even notice.

## What is tested and what is not

The collision rule is a pure function with no canvas, no timers and no DOM, so
it is tested directly: gaps that straddle zero, negative angles from `atan2`,
angles outside the usual range, the antipodal case, and the exact edge of a gap
counting as safe.

What the test cannot tell me is whether the collision feels fair. A player who
looks like they are inside the gap and dies anyway will call the game broken
even though the maths is right. Gap sizes, wave speeds, arrival spacing,
collision tolerance and how readable a wave is at speed are all things I can
only settle by playing the finished game and by watching other people play it
without saying anything.

So the split is: the tests establish that the rule is implemented correctly,
and playing establishes whether the rule is understandable and fair.

## Out of scope

No score counter, no timer, no menus, no difficulty select, no persistence, no
backend. It is a static site. Audio is one soft tone per wave passed, and only
once the game is playable and tuned — it is the last thing in, not the first.
