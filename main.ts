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

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  currentRadius = Math.min(ORBIT_RADIUS, 0.35 * Math.min(canvas.width, canvas.height));
  scale = currentRadius / ORBIT_RADIUS;
  schedule = buildSchedule(currentRadius, scale);

  // The schedule changed, so the in-flight run no longer matches it.
  resetRun();
}
window.addEventListener("resize", resize);

let playerAngle = PLAYER_START_ANGLE;

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

function draw(): void {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  for (const wave of active) {
    const start = wave.gapCentre + wave.gapHalfWidth;
    const end = wave.gapCentre - wave.gapHalfWidth + Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, wave.radius, start, end);
    ctx.stroke();
  }

  drawCentreForm(cx, cy, resolvedCount, state === "won");

  if (state !== "lost") {
    const px = cx + currentRadius * Math.cos(playerAngle);
    const py = cy + currentRadius * Math.sin(playerAngle);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
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

  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
