// Stillpoint entry point. See docs/stillpoint-spec.md for the design, and
// src/gameRules.ts / src/waves.ts for the rules this file must not reimplement.
import { isSafe } from "./src/gameRules.js";
import { waves, PLAYER_START_ANGLE } from "./src/waves.js";
import { ORBIT_RADIUS, PLAYER_ARC_HALF_WIDTH } from "./src/config.js";

// ORBIT_RADIUS is the maximum orbit radius. On a narrow window the orbit
// shrinks to fit; wave speed shrinks by the same factor so flight time in
// seconds stays identical at every window size. Both are recomputed on
// resize and stored here, so the rest of the code reads one current value.
let currentRadius: number;
let scale: number;

interface ScheduledWave {
  gapCentre: number;
  gapHalfWidth: number;
  speed: number;
  spawnTime: number;
}

// Arrival time is the running sum of arrivalDelay; spawn time is arrival time
// minus how long the wave spends travelling from the centre to the orbit.
function buildSchedule(radius: number, waveScale: number): ScheduledWave[] {
  let arrivalTime = 0;
  const built = waves.map((wave) => {
    arrivalTime += wave.arrivalDelay;
    const speed = wave.speed * waveScale;
    const spawnTime = arrivalTime - radius / speed;
    if (spawnTime < 0) {
      throw new Error(
        `wave spawn time is negative (${spawnTime.toFixed(3)}s) --- arrivalDelay/speed produce an impossible wave list`,
      );
    }
    return { gapCentre: wave.gapCentre, gapHalfWidth: wave.gapHalfWidth, speed, spawnTime };
  });
  built.sort((a, b) => a.spawnTime - b.spawnTime);
  return built;
}

let schedule: ScheduledWave[];

interface ActiveWave {
  gapCentre: number;
  gapHalfWidth: number;
  speed: number;
  radius: number;
  collisionChecked: boolean;
}

const canvasElement = document.querySelector("canvas");
if (!(canvasElement instanceof HTMLCanvasElement)) throw new Error("missing canvas element");
const canvas: HTMLCanvasElement = canvasElement;

const context = canvas.getContext("2d");
if (!context) throw new Error("2d canvas context unavailable");
const ctx: CanvasRenderingContext2D = context;

// ---- Deep-space background: starfield and haze ----
// Positions and brightness are rolled once per star/blob at generation time;
// the only thing that changes per frame is a slow rotation/twinkle driven by
// the animation clock, so nothing here is regenerated per frame.
interface Star {
  radius: number;
  angle: number;
  size: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  layer: number;
}

interface HazeBlob {
  driftAngle: number;
  driftRadius: number;
  driftSpeed: number;
  blobRadius: number;
  color: string;
}

const STAR_LAYER_DRIFT_SPEED = [0.0015, 0.003, 0.006]; // rad/s --- far to near
const HAZE_COLORS = ["70,90,190", "120,80,175", "60,150,180"]; // blue, violet, cyan

let stars: Star[] = [];
let hazeBlobs: HazeBlob[] = [];

function generateStarfield(width: number, height: number): void {
  const maxRadius = Math.hypot(width, height) / 2 + 50;
  const count = Math.min(420, Math.round((width * height) / 6000));
  stars = [];
  for (let i = 0; i < count; i++) {
    const bright = Math.random();
    const isBright = bright > 0.93;
    stars.push({
      radius: Math.random() * maxRadius,
      angle: Math.random() * Math.PI * 2,
      size: isBright ? 1.4 + Math.random() * 1.1 : 0.4 + Math.random() * 0.6,
      baseAlpha: isBright ? 0.6 + Math.random() * 0.35 : 0.1 + Math.random() * 0.22,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.3 + Math.random() * 0.5,
      layer: Math.floor(Math.random() * STAR_LAYER_DRIFT_SPEED.length),
    });
  }
}

function generateHaze(width: number, height: number): void {
  const maxDim = Math.max(width, height);
  hazeBlobs = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.6;
    hazeBlobs.push({
      driftAngle: angle,
      driftRadius: maxDim * (0.4 + Math.random() * 0.14),
      driftSpeed: 0.0008 + Math.random() * 0.0006,
      blobRadius: maxDim * (0.35 + Math.random() * 0.15),
      color: HAZE_COLORS[i % HAZE_COLORS.length]!,
    });
  }
}

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  currentRadius = Math.min(ORBIT_RADIUS, 0.35 * Math.min(canvas.width, canvas.height));
  scale = currentRadius / ORBIT_RADIUS;
  schedule = buildSchedule(currentRadius, scale);

  generateStarfield(canvas.width, canvas.height);
  generateHaze(canvas.width, canvas.height);

  // The schedule changed, so the in-flight run no longer matches it.
  resetRun();
}
window.addEventListener("resize", resize);

let playerAngle = PLAYER_START_ANGLE;

// A short trail of recent player positions, timestamped on the animation
// clock. Old points age out; overlapping points near the current position
// (the player holding still) are skipped so the trail never reads as a
// second dot.
interface TrailPoint {
  x: number;
  y: number;
  t: number;
}
const TRAIL_MAX_AGE = 0.12; // seconds
let trail: TrailPoint[] = [];

window.addEventListener("pointermove", (event) => {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  playerAngle = Math.atan2(event.clientY - cy, event.clientX - cx);
});

const MAX_DELTA = 0.05; // seconds --- caps a backgrounded tab's catch-up jump
const LOSS_PAUSE = 0.9; // seconds the player dot stays gone before restarting

// The centre form: one radiating line per wave survived, evenly spaced so a
// full set reads as a complete star. Sized well inside the orbit radius, and
// scaled by the same factor so it stays proportionate to the orbit.
const CENTRE_FORM_INNER_RADIUS = 6;
const CENTRE_FORM_OUTER_RADIUS = 36;
const CENTRE_FORM_START_ANGLE = -Math.PI / 2;

type RunState = "playing" | "lost" | "won";

let state: RunState;
let elapsed: number;
let nextWaveIndex: number;
let active: ActiveWave[];
let resolvedCount: number;
let lossTimer: number;

function resetRun(): void {
  state = "playing";
  elapsed = 0;
  nextWaveIndex = 0;
  active = [];
  resolvedCount = 0;
  lossTimer = 0;
  trail = [];
}

resize();

function maxVisibleRadius(): number {
  return Math.hypot(canvas.width, canvas.height) / 2 + 50;
}

function update(dt: number): void {
  elapsed += dt;

  while (nextWaveIndex < schedule.length && schedule[nextWaveIndex].spawnTime <= elapsed) {
    const scheduled = schedule[nextWaveIndex];
    active.push({
      gapCentre: scheduled.gapCentre,
      gapHalfWidth: scheduled.gapHalfWidth,
      speed: scheduled.speed,
      radius: 0,
      collisionChecked: false,
    });
    nextWaveIndex++;
  }

  for (const wave of active) {
    const before = wave.radius;
    wave.radius += wave.speed * dt;

    if (!wave.collisionChecked && before < currentRadius && wave.radius >= currentRadius) {
      wave.collisionChecked = true;
      const safe = isSafe(playerAngle, wave.gapCentre, wave.gapHalfWidth - PLAYER_ARC_HALF_WIDTH);
      if (!safe) {
        state = "lost";
        lossTimer = 0;
        return;
      }
      resolvedCount++;
      if (resolvedCount === waves.length) {
        state = "won";
        active = [];
        return;
      }
    }
  }

  const limit = maxVisibleRadius();
  active = active.filter((wave) => wave.radius <= limit);
}

function drawCentreForm(cx: number, cy: number, count: number, won: boolean): void {
  if (count <= 0) return;

  ctx.strokeStyle = won ? "white" : "#999";
  ctx.lineWidth = won ? 4 : 2;
  ctx.lineCap = "round";

  const innerRadius = CENTRE_FORM_INNER_RADIUS * scale;
  const outerRadius = CENTRE_FORM_OUTER_RADIUS * scale;

  for (let i = 0; i < count; i++) {
    const angle = CENTRE_FORM_START_ANGLE + (i * Math.PI * 2) / waves.length;
    const x1 = cx + innerRadius * Math.cos(angle);
    const y1 = cy + innerRadius * Math.sin(angle);
    const x2 = cx + outerRadius * Math.cos(angle);
    const y2 = cy + outerRadius * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.lineCap = "butt";
}

function drawBackground(cx: number, cy: number): void {
  const maxRadius = Math.hypot(canvas.width, canvas.height) / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
  gradient.addColorStop(0, "#0a0f2c");
  gradient.addColorStop(0.45, "#05071a");
  gradient.addColorStop(1, "#000002");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Muted cosmic haze, kept near the outer screen and additive so it reads as
// faint light rather than paint. Drift is slow enough it borders on static.
function drawHaze(cx: number, cy: number, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const blob of hazeBlobs) {
    const angle = blob.driftAngle + t * blob.driftSpeed;
    const x = cx + Math.cos(angle) * blob.driftRadius;
    const y = cy + Math.sin(angle) * blob.driftRadius;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.blobRadius);
    gradient.addColorStop(0, `rgba(${blob.color},0.05)`);
    gradient.addColorStop(1, `rgba(${blob.color},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, blob.blobRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStars(cx: number, cy: number, t: number): void {
  for (const star of stars) {
    const angle = star.angle + t * STAR_LAYER_DRIFT_SPEED[star.layer]!;
    const x = cx + Math.cos(angle) * star.radius;
    const y = cy + Math.sin(angle) * star.radius;
    const twinkle = 0.75 + 0.25 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
    ctx.fillStyle = `rgba(220,228,255,${(star.baseAlpha * twinkle).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A gravitational trace rather than a UI border: thin and low-opacity.
function drawOrbit(cx: number, cy: number): void {
  ctx.strokeStyle = "rgba(130,150,215,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCentralStar(cx: number, cy: number): void {
  const glowRadius = 42 * scale;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
  gradient.addColorStop(0, "rgba(215,228,255,0.5)");
  gradient.addColorStop(0.3, "rgba(150,180,255,0.16)");
  gradient.addColorStop(1, "rgba(150,180,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();
}

// Each wave is a bright core plus a wider, much more transparent glow. Both
// strokes share the exact same start/end angles and the default ("butt")
// line cap, so the flat cut at the gap boundary is radial and independent of
// line width --- the glow cannot bleed past it however wide it gets.
function drawWaves(cx: number, cy: number): void {
  for (const wave of active) {
    const start = wave.gapCentre + wave.gapHalfWidth;
    const end = wave.gapCentre - wave.gapHalfWidth + Math.PI * 2;
    const proximity = Math.min(1, wave.radius / currentRadius);

    ctx.strokeStyle = `rgba(150,190,255,${(0.1 + 0.18 * proximity).toFixed(3)})`;
    ctx.lineWidth = (14 + 10 * proximity) * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, wave.radius, start, end);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${(0.55 + 0.45 * proximity).toFixed(3)})`;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, wave.radius, start, end);
    ctx.stroke();
  }
}

// Bright core, faint glow, and a short trail that fades fast --- the trail is
// always dimmer and drawn beneath the core, so the player's exact position
// stays unambiguous.
function drawPlayer(cx: number, cy: number, t: number): void {
  const px = cx + currentRadius * Math.cos(playerAngle);
  const py = cy + currentRadius * Math.sin(playerAngle);

  trail.push({ x: px, y: py, t });
  while (trail.length > 0 && t - trail[0]!.t > TRAIL_MAX_AGE) trail.shift();

  for (const point of trail) {
    const life = 1 - (t - point.t) / TRAIL_MAX_AGE;
    if (life <= 0) continue;
    const distance = Math.hypot(point.x - px, point.y - py);
    if (distance < 1.5) continue;
    ctx.fillStyle = `rgba(190,215,255,${(life * 0.35).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4 * scale * life, 0, Math.PI * 2);
    ctx.fill();
  }

  const glowRadius = 14 * scale;
  const gradient = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
  gradient.addColorStop(0, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(px, py, Math.max(4, 6 * scale), 0, Math.PI * 2);
  ctx.fill();
}

function draw(t: number): void {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  drawBackground(cx, cy);
  drawHaze(cx, cy, t);
  drawStars(cx, cy, t);

  drawOrbit(cx, cy);
  drawCentralStar(cx, cy);
  drawWaves(cx, cy);

  drawCentreForm(cx, cy, resolvedCount, state === "won");

  if (state !== "lost") {
    drawPlayer(cx, cy, t);
  }
}

let lastTimestamp: number | null = null;

function frame(timestamp: number): void {
  if (lastTimestamp === null) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, MAX_DELTA);
  lastTimestamp = timestamp;

  if (state === "playing") {
    update(dt);
  } else if (state === "lost") {
    lossTimer += dt;
    if (lossTimer >= LOSS_PAUSE) resetRun();
  }

  draw(timestamp / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
