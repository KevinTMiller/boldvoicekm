/**
 * Tests for the goal presets and the slider-position mapping in session-goals.ts.
 */
import {
  convertGoalMinutesToSeconds,
  DEFAULT_SESSION_GOAL_MINUTES,
  getGoalMinutesAtSliderPosition,
  getGoalSliderPosition,
  SESSION_GOAL_OPTIONS_MINUTES,
} from '@/features/study-timer/session-goals';

// Requirement: the slider offers 1 minute plus 15–90, and opens on 15.
describe('goal presets', () => {
  it('offers the requested goals, shortest first, including a 1 minute testing stop', () => {
    expect(SESSION_GOAL_OPTIONS_MINUTES).toEqual([1, 15, 20, 25, 30, 45, 60, 75, 90]);
  });

  it('preselects 15 minutes, one step in from the 1 minute stop', () => {
    expect(DEFAULT_SESSION_GOAL_MINUTES).toBe(15);
    expect(
      getGoalSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, DEFAULT_SESSION_GOAL_MINUTES)
    ).toBe(1);
  });

  it('converts minutes to the seconds stored on a session', () => {
    expect(convertGoalMinutesToSeconds(45)).toBe(2700);
  });
});

// Requirement: options are evenly spaced on the slider, one step each, not spaced by minutes.
describe('getGoalSliderPosition', () => {
  it('places each option one step after the previous one', () => {
    const positions = SESSION_GOAL_OPTIONS_MINUTES.map((goalMinutes) =>
      getGoalSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, goalMinutes)
    );

    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('falls back to the closest option for a goal that is not offered', () => {
    // 50 is 5 away from 45 (position 5) and 10 away from 60.
    expect(getGoalSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 50)).toBe(5);
    expect(getGoalSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 500)).toBe(8);
  });

  it('breaks ties toward the shorter goal', () => {
    expect(getGoalSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 37.5)).toBe(4);
  });
});

// Requirement: whatever position the slider reports maps to exactly one offered goal.
describe('getGoalMinutesAtSliderPosition', () => {
  it('reads the goal at a whole-step position', () => {
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 0)).toBe(1);
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 5)).toBe(45);
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 8)).toBe(90);
  });

  it('rounds a mid-drag position to the nearest step', () => {
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 5.4)).toBe(45);
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 5.6)).toBe(60);
  });

  it('clamps positions past either end', () => {
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, -3)).toBe(1);
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, 12)).toBe(90);
  });

  it('reads a non-finite position as the first option', () => {
    expect(getGoalMinutesAtSliderPosition(SESSION_GOAL_OPTIONS_MINUTES, Number.NaN)).toBe(1);
  });
});
