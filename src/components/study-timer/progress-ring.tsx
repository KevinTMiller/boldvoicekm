/**
 * Progress ring (View layer).
 * A thick circular track that fills clockwise from 12 o'clock toward the session goal in one solid
 * stroke, with rounded ends. Once the goal is complete the stroke closes and turns the accent blue.
 * The stroke is a real circular border swept across the ring — not a
 * chain of straight rectangles — so the leading edge is only the round cap, with no square end
 * beside it. Dimmed while the session is paused. Screen readers get it as a "Goal progress"
 * progress bar. Presentational; ActiveSessionCard lays the session's emoji, time, title and
 * Pause/Resume button on top of it.
 */
import { StyleSheet, View } from 'react-native';

import {
  getArcColor,
  getArcHeadAngleDegrees,
  getProgressPercent,
  getRingCap,
  getRingSweep,
  type RingCap,
  type RingDimensions,
} from '@/components/study-timer/progress-ring-geometry';
import { useTheme } from '@/hooks/use-theme';

/** Props for ProgressRing. */
export type ProgressRingProps = {
  /** Fraction of the goal completed, from 0 to 1. Values outside are clamped. */
  progress: number;
  /** Outer diameter, in points. */
  diameter: number;
  /** Width of the track and the arc, in points. */
  thickness: number;
  /** Weakens the arc's color; set while the session is paused. Ignored once finished. */
  isDimmed: boolean;
  /** Closes the ring and draws it in the finished color. Set once the goal is complete. */
  isFinished: boolean;
};

/**
 * How far each half-ring clip extends past the vertical center, in points. The two halves meet
 * at 6 o'clock and 12 o'clock; overlapping them by a point hides the hairline seam there.
 */
const CENTER_SEAM_OVERLAP = 1;

/**
 * The goal progress ring.
 *
 * @param props - Progress, size and dimmed state.
 */
export function ProgressRing({
  progress,
  diameter,
  thickness,
  isDimmed,
  isFinished,
}: ProgressRingProps) {
  const theme = useTheme();
  const dimensions = { diameter, thickness };
  const sweep = getRingSweep(isFinished ? 1 : progress);
  const arcColor = getArcColor(
    theme.progressTrack,
    theme.progressRing,
    isDimmed,
    isFinished,
    theme.accent
  );
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Goal progress"
      accessibilityValue={{ min: 0, max: 100, now: getProgressPercent(progress) }}
      style={{ width: diameter, height: diameter }}>
      <View
        style={[
          styles.circle,
          { borderRadius: diameter / 2, borderWidth: thickness, borderColor: theme.progressTrack },
        ]}
      />
      {sweep?.isComplete && (
        <View
          style={[
            styles.circle,
            { borderRadius: diameter / 2, borderWidth: thickness, borderColor: arcColor },
          ]}
        />
      )}
      {sweep !== null && !sweep.isComplete && (
        <>
          <RingSweepHalf
            dimensions={dimensions}
            color={arcColor}
            side="right"
            rotationDegrees={sweep.rightHalfRotationDegrees}
          />
          {sweep.leftHalfRotationDegrees !== null && (
            <RingSweepHalf
              dimensions={dimensions}
              color={arcColor}
              side="left"
              rotationDegrees={sweep.leftHalfRotationDegrees}
            />
          )}
          {/* Tail cap first and head cap last, so near a full turn the head sits on top. */}
          <RingCapView cap={getRingCap(0, dimensions)} color={arcColor} />
          <RingCapView cap={getRingCap(getArcHeadAngleDegrees(progress), dimensions)} color={arcColor} />
        </>
      )}
    </View>
  );
}

/** Which half of the ring a sweep is clipped to. */
type RingHalfSide = 'right' | 'left';

/** Props for RingSweepHalf. */
type RingSweepHalfProps = {
  /** Ring size. The semicircle is this diameter, so its border matches the track. */
  dimensions: RingDimensions;
  /** Solid color of the stroke. */
  color: string;
  /** Right covers 12 o'clock to 6 o'clock; left covers the rest of the turn. */
  side: RingHalfSide;
  /** Clockwise rotation of the semicircle, from getRingSweep. */
  rotationDegrees: number;
};

/**
 * One half of the solid arc: a semicircular border rotated inside a clip.
 * The clip is fixed to one side of the ring. The border starts as the 12-to-6 semicircle and
 * rotates about the ring's center, so the clip reveals a smooth circular stroke instead of a
 * straight-edged segment.
 *
 * @param props - Size, color, which half, and how far that half has rotated.
 */
function RingSweepHalf({ dimensions, color, side, rotationDegrees }: RingSweepHalfProps) {
  const { diameter, thickness } = dimensions;
  const half = diameter / 2;
  const isRightSide = side === 'right';
  return (
    <View
      collapsable={false}
      style={[
        styles.clip,
        {
          left: isRightSide ? half - CENTER_SEAM_OVERLAP : 0,
          width: half + CENTER_SEAM_OVERLAP,
          height: diameter,
        },
      ]}>
      <View
        style={{
          position: 'absolute',
          // The rotating view is `diameter` wide and must stay centered on the ring, not on the clip.
          left: isRightSide ? CENTER_SEAM_OVERLAP - half : 0,
          width: diameter,
          height: diameter,
          transform: [{ rotate: `${rotationDegrees}deg` }],
        }}>
        <View
          collapsable={false}
          style={[styles.clip, { left: half, width: half, height: diameter }]}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: -half,
              width: diameter,
              height: diameter,
              borderRadius: half,
              borderWidth: thickness,
              borderColor: color,
            }}
          />
        </View>
      </View>
    </View>
  );
}

/** Props for RingCapView. */
type RingCapViewProps = {
  /** Where the cap goes and how big it is. */
  cap: RingCap;
  /** Fill color. */
  color: string;
};

/**
 * One rounded end of the arc. It sits on the stroke's radial cut and is exactly as wide as the
 * stroke, so the cut is the circle's diameter and no square corner sticks out past it.
 *
 * @param props - Cap placement and color.
 */
function RingCapView({ cap, color }: RingCapViewProps) {
  return (
    <View
      style={{
        position: 'absolute',
        left: cap.left,
        top: cap.top,
        width: cap.size,
        height: cap.size,
        borderRadius: cap.size / 2,
        backgroundColor: color,
      }}
    />
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    // A transparent background makes Android honor overflow:hidden on this clip.
    backgroundColor: 'transparent',
  },
});
