import { describe, it, expect } from "vitest";
import { polygonToMask } from "./polygonMask";

describe("polygonToMask", () => {
  it("fills a square exactly", () => {
    const mask = polygonToMask(
      [
        { x: 2, y: 2 },
        { x: 6, y: 2 },
        { x: 6, y: 6 },
        { x: 2, y: 6 },
      ],
      10,
      10
    );
    expect(mask[4 * 10 + 4]).toBe(1); // center of the square
    expect(mask[0 * 10 + 0]).toBe(0); // outside, top-left corner
    expect(mask[9 * 10 + 9]).toBe(0); // outside, bottom-right corner
  });

  it("fills a triangle", () => {
    const mask = polygonToMask(
      [
        { x: 5, y: 1 },
        { x: 9, y: 9 },
        { x: 1, y: 9 },
      ],
      10,
      10
    );
    expect(mask[8 * 10 + 5]).toBe(1); // near the base, centered under the apex
    expect(mask[0 * 10 + 0]).toBe(0); // above the apex, outside
  });

  it("returns an empty mask for fewer than 3 points", () => {
    const mask = polygonToMask(
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      10,
      10
    );
    expect(mask.every((v) => v === 0)).toBe(true);
  });

  it("returns a mask sized width * height", () => {
    const mask = polygonToMask(
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 4 },
      ],
      10,
      10
    );
    expect(mask.length).toBe(100);
  });

  it("fills the overlap of a self-intersecting figure-eight-like path (nonzero winding, not even-odd)", () => {
    // Points 0-3 trace one clockwise rectangle (x:2-14, y:2-14); points 4-7
    // trace a second clockwise rectangle (x:8-20, y:8-20); as ONE polygon
    // the two are joined by crossing diagonal edges (P3->P4 and P7->P0),
    // producing a single self-intersecting loop — the shape a freehand
    // Lasso stroke produces when an unsteady hand loops back over itself.
    //
    // Hand-traced at scanline y=11 (scanY=11.5):
    //   edge P1->P2 (x=14 vertical, downward)   -> crossing x=14,   dir +1
    //   edge P3->P4 ((2,14)-(8,8) diagonal, upward) -> crossing x=4.5, dir -1
    //   edge P5->P6 (x=20 vertical, downward)   -> crossing x=20,   dir +1
    //   edge P7->P0 ((8,20)-(2,2) diagonal, upward) -> crossing x=5.1667, dir -1
    // Sorted by x: (4.5,-1), (5.1667,-1), (14,+1), (20,+1).
    // Running winding after each: -1, -2, -1 — nonzero across the ENTIRE
    // span from x=4.5 to x=20, including the middle span x=5..13 (winding
    // -2, the doubly-wound overlap of the two rectangles).
    //
    // Under the old even-odd rule, intersections pair up as (4.5,5.1667)
    // and (14,20), leaving x=5..13 — the overlap region — as an unfilled
    // hole in the middle of the selection. Nonzero winding must fill it.
    const mask = polygonToMask(
      [
        { x: 2, y: 2 },
        { x: 14, y: 2 },
        { x: 14, y: 14 },
        { x: 2, y: 14 },
        { x: 8, y: 8 },
        { x: 20, y: 8 },
        { x: 20, y: 20 },
        { x: 8, y: 20 },
      ],
      22,
      22
    );
    expect(mask[11 * 22 + 9]).toBe(1); // inside the overlap - must be filled, not a hole
    expect(mask[0 * 22 + 0]).toBe(0); // sanity: still empty far outside both rectangles
  });
});
