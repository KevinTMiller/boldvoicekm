/**
 * Guards the ActivityKit attributes struct, which exists twice on purpose: once in this module's
 * native bridge and once in the widget extension. ActivityKit only routes an activity to its widget
 * when both copies match, and a mismatch shows up only at runtime on a device, as a Live Activity
 * that never renders. This test catches drift on every `npm test`.
 */

// The app's tsconfig deliberately leaves out Node's global types, so React Native code cannot use
// Node-only APIs by accident. The few Node pieces this test needs are typed locally instead.

/** Directory of this file. Jest provides it at runtime. */
declare const __dirname: string;
/** The part of Node's `fs` module this test uses. */
type FileSystemModule = { readFileSync(filePath: string, encoding: 'utf8'): string };
/** The part of Node's `path` module this test uses. */
type PathModule = { join(...pathSegments: string[]): string };

const { readFileSync } = jest.requireActual<FileSystemModule>('fs');
const { join } = jest.requireActual<PathModule>('path');

const projectRoot = join(__dirname, '..', '..', '..');
const bridgeCopyPath = join(projectRoot, 'modules/study-timer-activity/ios/StudyTimerAttributes.swift');
const widgetCopyPath = join(projectRoot, 'targets/study-timer-widget/Shared/StudyTimerAttributes.swift');

// Requirement: the bridge and the widget agree on the Live Activity's data shape.
describe('StudyTimerAttributes.swift copies', () => {
  it('are byte-identical in the native bridge and the widget extension', () => {
    const bridgeCopy = readFileSync(bridgeCopyPath, 'utf8');
    const widgetCopy = readFileSync(widgetCopyPath, 'utf8');

    expect(widgetCopy).toBe(bridgeCopy);
  });
});
