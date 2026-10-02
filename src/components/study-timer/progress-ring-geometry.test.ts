/**
 * Tests for the progress ring geometry: how far the arc sweeps, where its round ends sit, and its
 * solid color. Uses a 260 pt ring that is 20 pt thick, so the circle through the middle of the
 * ring has a radius of 120 pt around the point (130, 130).
 */
import {
  getArcColor,
  getArcHeadAngleDegrees,
  getProgressPercent,
  getRingCap,
  getRingSweep,
  mixHexColors,
} from '@/components/study-timer/progress-ring-geometry';

const dimensions = { diameter: 260, thickness: 20 };
const TRACK_COLOR = '#000000';
const FILL_COLOR = '#ffffff';

// Requirement: the ring fills clockwise toward the goal, and never past it.
describe('how far the arc reaches', () => {
  it('places the head at the progress angle, clamped to one full turn', () => {
    expect(getArcHeadAngleDegrees(0.25)).toBe(90);
    expect(getArcHeadAngleDegrees(1.7)).toBe(360);
    expect(getArcHeadAngleDegrees(-1)).toBe(0);
    expect(getArcHeadAngleDegrees(Number.NaN)).toBe(0);
  });

  it('reports a whole, clamped percentage for screen readers', () => {
    expect(getProgressPercent(0.404)).toBe(40);
    expect(getProgressPercent(1.2)).toBe(100);
  });
});

// Requirement: the arc is one circular stroke. Each half rotates a 12-to-6 semicircle into a clip,
// and a full turn is a single circle rather than two halves butted together.
describe('getRingSweep', () => {
  it('draws nothing before the arc has started', () => {
    expect(getRingSweep(0)).toBeNull();
    expect(getRingSweep(Number.NaN)).toBeNull();
  });

  it('sweeps only the right half on the way from 12 o’clock to 6 o’clock', () => {
    expect(getRingSweep(0.25)).toEqual({
      rightHalfRotationDegrees: -90,
      leftHalfRotationDegrees: null,
      isComplete: false,
    });
    expect(getRingSweep(0.5)).toEqual({
      rightHalfRotationDegrees: 0,
      leftHalfRotationDegrees: null,
      isComplete: false,
    });
  });

  it('holds the right half still and continues on the left past 6 o’clock', () => {
    expect(getRingSweep(0.75)).toEqual({
      rightHalfRotationDegrees: 0,
      leftHalfRotationDegrees: 90,
      isComplete: false,
    });
  });

  it('closes into one solid ring at a full turn', () => {
    expect(getRingSweep(1)).toEqual({
      rightHalfRotationDegrees: 0,
      leftHalfRotationDegrees: 180,
      isComplete: true,
    });
    expect(getRingSweep(1.7)?.isComplete).toBe(true);
  });
});

// Requirement: both ends of the arc are rounded, like the design reference.
describe('getRingCap', () => {
  it('puts the tail cap at 12 o’clock, flush with the top edge', () => {
    expect(getRingCap(0, dimensions)).toEqual({ left: 120, top: 0, size: 20 });
  });

  it('puts a cap at 3 and 6 o’clock flush with the right and bottom edges', () => {
    const rightCap = getRingCap(90, dimensions);
    const bottomCap = getRingCap(180, dimensions);

    expect(rightCap.left).toBeCloseTo(240);
    expect(rightCap.top).toBeCloseTo(120);
    expect(bottomCap.left).toBeCloseTo(120);
    expect(bottomCap.top).toBeCloseTo(240);
  });
});

// Requirement: the arc is one solid color, and that color dims while paused.
describe('getArcColor', () => {
  it('uses the fill color for the whole arc while running', () => {
    expect(getArcColor(TRACK_COLOR, FILL_COLOR, false)).toBe('#ffffff');
  });

  it('dims that same color while paused', () => {
    expect(getArcColor(TRACK_COLOR, FILL_COLOR, true)).toBe('#737373');
  });

  it('uses the finished color at full strength, even if the session is also paused', () => {
    expect(getArcColor(TRACK_COLOR, FILL_COLOR, true, true, '#208AEF')).toBe('#208AEF');
  });
});

// Requirement: theme colors blend predictably, and bad input never produces an invalid color.
describe('mixHexColors', () => {
  it('returns the end colors at amounts 0 and 1, and blends in between', () => {
    expect(mixHexColors('#FF0000', '#0000FF', 0)).toBe('#ff0000');
    expect(mixHexColors('#FF0000', '#0000FF', 1)).toBe('#0000ff');
    expect(mixHexColors('#000000', '#FF6B2B', 0.5)).toBe('#803616');
  });

  it('clamps amounts outside 0–1', () => {
    expect(mixHexColors('#000000', '#ffffff', 2)).toBe('#ffffff');
  });

  it('returns the target color unchanged when a color is not #RRGGBB', () => {
    expect(mixHexColors('red', '#FF6B2B', 0.5)).toBe('#FF6B2B');
  });
});
