import { describe, expect, it } from "vitest";
import { angularDistance, isSafe } from "../src/gameRules.js";

const deg = (degrees: number): number => (degrees * Math.PI) / 180;

describe("angularDistance", () => {
  it("returns the distance between ordinary non-wrapping angles", () => {
    expect(angularDistance(deg(30), deg(80))).toBeCloseTo(deg(50));
  });

  it("uses the shorter distance across the 0/2pi boundary in both directions", () => {
    expect(angularDistance(deg(350), deg(10))).toBeCloseTo(deg(20));
    expect(angularDistance(deg(10), deg(350))).toBeCloseTo(deg(20));
  });

  it("handles negative angles produced by atan2", () => {
    // a - b goes below -pi here, which is where a single modulo goes wrong.
    expect(angularDistance((-3 * Math.PI) / 4, (3 * Math.PI) / 4)).toBeCloseTo(Math.PI / 2);
  });

  it("accepts angles outside the usual range", () => {
    // 7pi and pi are three full turns apart, so they are the same direction.
    expect(angularDistance(7 * Math.PI, Math.PI)).toBeCloseTo(0);
  });

  it("returns pi for antipodal angles", () => {
    expect(angularDistance(0, Math.PI)).toBeCloseTo(Math.PI);
  });

  it("returns zero for identical angles", () => {
    expect(angularDistance(Math.PI / 3, Math.PI / 3)).toBeCloseTo(0);
  });

  it("measures the exact edge of a gap", () => {
    // The number isSafe compares against gapHalfWidth. Pinned on its own
    // because the boundary is where a fairness complaint would land.
    expect(angularDistance(deg(110), deg(90))).toBeCloseTo(deg(20));
  });
});

describe("isSafe", () => {
  const gapCentre = deg(90);
  const gapHalfWidth = deg(20);

  it("lets the player through when they are in the middle of the gap", () => {
    expect(isSafe(gapCentre, gapCentre, gapHalfWidth)).toBe(true);
  });

  it("lets the player through when they are inside the gap", () => {
    expect(isSafe(deg(105), gapCentre, gapHalfWidth)).toBe(true);
  });

  it("lets the player through on the exact edge of the gap", () => {
    expect(isSafe(deg(110), gapCentre, gapHalfWidth)).toBe(true);
  });

  it("ends the round when the player is outside the gap", () => {
    expect(isSafe(deg(115), gapCentre, gapHalfWidth)).toBe(false);
  });

  it("ends the round when the player is on the far side of the orbit", () => {
    expect(isSafe(deg(270), gapCentre, gapHalfWidth)).toBe(false);
  });

  it("lets the player through in a gap that straddles zero", () => {
    // Player at 350 degrees, gap centred on 10. The naive difference is 340
    // degrees, which would kill a player who is visibly standing in the gap.
    expect(isSafe(deg(350), deg(10), deg(25))).toBe(true);
  });

  it("ends the round just outside a gap that straddles zero", () => {
    expect(isSafe(deg(340), deg(10), deg(25))).toBe(false);
  });
});
