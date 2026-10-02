/**
 * Progress ring geometry (View layer, pure).
 * The math for the active-session progress ring. The arc itself is a real circular border, clipped
 * to the swept angle (see progress-ring.tsx), so it stays one solid stroke instead of a chain of
 * straight rectangles. These helpers only answer how far that stroke has swept and where its round
 * ends sit. Angles are degrees clockwise from 12 o'clock; lengths are points relative to the ring's
 * top-left corner. Used by progress-ring.tsx.
 */

/** Share of its normal strength the arc keeps while dimmed (the session is paused). */
const DIMMED_COLOR_STRENGTH = 0.45;

/** Six-digit hex color such as "#FF6B2B", the format of the theme's color tokens. */
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** Size of the ring, in points. */
export type RingDimensions = {
  /** Outer diameter. */
  diameter: number;
  /** Width of the track and of the arc on top of it. */
  thickness: number;
};

/**
 * How to rotate the two semicircle clips that make up the arc. Each rotation is of a semicircle
 * that natively covers 12 o'clock to 6 o'clock; ProgressRing clips one copy to each half of the
 * ring. Null `leftHalfRotationDegrees` means the arc has not passed 6 o'clock, so that half is
 * not drawn.
 */
export type RingSweep = {
  /** Clockwise rotation of the semicircle inside the right-hand clip. From -180 up to 0. */
  rightHalfRotationDegrees: number;
  /** Clockwise rotation of the semicircle inside the left-hand clip, or null before 6 o'clock. */
  leftHalfRotationDegrees: number | null;
  /** A full turn. The ring is one solid circle then, with no ends to round off. */
  isComplete: boolean;
};

/** A round end of the arc: a circle as wide as the ring is thick. */
export type RingCap = {
  /** Left edge of the circle's bounding box. */
  left: number;
  /** Top edge of the circle's bounding box. */
  top: number;
  /** Diameter of the circle; equals the ring thickness. */
  size: number;
};

/**
 * Finds where the arc's head is.
 *
 * @param progress - Goal progress. Values outside 0–1 are clamped.
 * @returns The head's angle, from 0 to 360.
 */
export function getArcHeadAngleDegrees(progress: number): number {
  return clampToUnitInterval(progress) * 360;
}

/**
 * Describes the semicircle rotations that sweep the arc from 12 o'clock to the head.
 * Rotating a uniform ring does nothing, so each half is a semicircular border rotated into a
 * fixed clip. The right clip shows 12 o'clock to 6 o'clock; the left clip shows the rest. A
 * semicircle that starts covering 12-to-6, rotated by `head - 180`, shows exactly 12 o'clock to
 * the head inside those clips — and stops at 6 o'clock on the right, so the first half of the
 * turn is not rotated away once the arc continues past it.
 *
 * @param progress - Goal progress. Values outside 0–1 are clamped.
 * @returns The sweep, or null when there is no arc yet.
 */
export function getRingSweep(progress: number): RingSweep | null {
  const headDegrees = getArcHeadAngleDegrees(progress);
  if (headDegrees <= 0) {
    return null;
  }
  return {
    rightHalfRotationDegrees: Math.min(headDegrees, 180) - 180,
    leftHalfRotationDegrees: headDegrees > 180 ? headDegrees - 180 : null,
    isComplete: headDegrees >= 360,
  };
}

/**
 * Converts progress into the whole percentage screen readers announce.
 *
 * @param progress - Goal progress. Values outside 0–1 are clamped.
 * @returns From 0 to 100.
 */
export function getProgressPercent(progress: number): number {
  return Math.round(clampToUnitInterval(progress) * 100);
}

/**
 * Places a round cap on the ring.
 *
 * @param angleDegrees - Where the cap sits: 0 for the tail, getArcHeadAngleDegrees for the head.
 * @param dimensions - Ring size.
 * @returns The cap's bounding box.
 */
export function getRingCap(angleDegrees: number, dimensions: RingDimensions): RingCap {
  const center = getPointOnRingCenterline(angleDegrees, dimensions);
  const { thickness } = dimensions;
  return { left: center.x - thickness / 2, top: center.y - thickness / 2, size: thickness };
}

/**
 * Picks the arc's color. The whole arc uses this one color. A finished session uses
 * `finishedColor` at full strength, so the closed ring is solid blue rather than a dimmed orange.
 *
 * @param trackColor - Track color (#RRGGBB) the arc blends toward while dimmed.
 * @param fillColor - Arc color (#RRGGBB) while the session is running.
 * @param isDimmed - Whether the session is paused, which weakens the arc. Ignored once finished.
 * @param isFinished - Whether the goal is complete.
 * @param finishedColor - Arc color once the goal is complete. Defaults to `fillColor`.
 * @returns `finishedColor` when finished, `fillColor` while running, or that color blended toward
 *   the track while paused.
 */
export function getArcColor(
  trackColor: string,
  fillColor: string,
  isDimmed: boolean,
  isFinished = false,
  finishedColor = fillColor
): string {
  if (isFinished) {
    return finishedColor;
  }
  return isDimmed ? mixHexColors(trackColor, fillColor, DIMMED_COLOR_STRENGTH) : fillColor;
}

/**
 * Blends two colors channel by channel.
 *
 * @param fromColor - Color at amount 0, as #RRGGBB.
 * @param toColor - Color at amount 1, as #RRGGBB.
 * @param amount - How far to move from `fromColor` toward `toColor`. Values outside 0–1 are
 *   clamped.
 * @returns The blend as #rrggbb, or `toColor` unchanged if either color is not #RRGGBB.
 */
export function mixHexColors(fromColor: string, toColor: string, amount: number): string {
  if (!HEX_COLOR_PATTERN.test(fromColor) || !HEX_COLOR_PATTERN.test(toColor)) {
    return toColor;
  }
  const fromChannels = parseHexColorChannels(fromColor);
  const toChannels = parseHexColorChannels(toColor);
  const clampedAmount = clampToUnitInterval(amount);
  const mixedChannels = fromChannels.map((fromChannel, index) =>
    Math.round(fromChannel + (toChannels[index] - fromChannel) * clampedAmount)
  );
  return `#${mixedChannels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Finds a point on the circle that runs through the middle of the ring's thickness.
 *
 * @param angleDegrees - Clockwise from 12 o'clock.
 * @param dimensions - Ring size.
 * @returns The point, relative to the ring's top-left corner.
 */
function getPointOnRingCenterline(
  angleDegrees: number,
  { diameter, thickness }: RingDimensions
): { x: number; y: number } {
  const center = diameter / 2;
  const centerlineRadius = (diameter - thickness) / 2;
  const angleRadians = convertDegreesToRadians(angleDegrees);
  return {
    x: center + centerlineRadius * Math.sin(angleRadians),
    y: center - centerlineRadius * Math.cos(angleRadians),
  };
}

/**
 * Splits a #RRGGBB color into its red, green and blue channels.
 *
 * @param color - A color already checked against HEX_COLOR_PATTERN.
 * @returns Channels from 0 to 255.
 */
function parseHexColorChannels(color: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
}

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees.
 * @returns The same angle in radians.
 */
function convertDegreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Clamps a number to the 0–1 range, reading NaN as 0.
 *
 * @param value - Number to clamp.
 * @returns The clamped value.
 */
function clampToUnitInterval(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}
