# Crit 5 — Stillpoint

## What was the breakthrough that moved the work forward?

Breaking my own code on purpose.

The whole game rests on one function that measures the distance between two
angles the short way round the circle. I reasoned it out carefully, wrote seven
test cases, and they all passed. That should have been the end of it.

Instead I mutated the function twice to see whether the tests would notice.
The first mutation was loud and failed nine of fourteen cases. The second was
the realistic one — the bug you get if you forget that JavaScript's `%` is a
remainder and not a modulo — and every single test passed. My cases had only
ever checked wraparound in one argument order, so the input that triggers the
bug never appeared.

The tests were green and blind at the same time. I fixed the tests, not the
code, and I watched the new assertions fail against the broken version before I
restored it.

## What did this work change about who I want to be as a software developer?

The same thing happened three more times this week. `pnpm check` passed while
three files the game needs were sitting untracked on my disk. The agent
reported that it had used eighteen waves when the file said twelve. I was
confident about a difficulty curve I could not actually clear until I sat down
and played it thirty times.

Four green signals, none of them telling me the truth.

What I want to be is someone who asks what a check would fail on before
trusting it that it passed. A test I have never seen fail proves nothing. A
build that only works on my laptop is not a build. And an agent's summary of
its own work is a claim, not evidence — the file is the evidence.
