import { describe, expect, it } from "vitest";
import { fitWithinMax } from "./downscale";

describe("fitWithinMax", () => {
  it("leaves an image unchanged if already within the max dimension", () => {
    expect(fitWithinMax(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("scales down a landscape image preserving aspect ratio", () => {
    expect(fitWithinMax(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales down a portrait image preserving aspect ratio", () => {
    expect(fitWithinMax(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("scales down a square image", () => {
    expect(fitWithinMax(5000, 5000, 1600)).toEqual({ width: 1600, height: 1600 });
  });
});
