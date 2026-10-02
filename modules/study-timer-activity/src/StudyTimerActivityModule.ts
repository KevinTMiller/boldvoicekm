/**
 * Native module handle (native bridge layer).
 * Loads the Swift "StudyTimerActivity" module (../ios/StudyTimerActivityModule.swift) if this build
 * includes it. The handle is null on Android, on web, in Expo Go and in Jest, so app code should go
 * through the null-safe API in index.ts instead of importing this file directly.
 */
import { requireOptionalNativeModule } from 'expo';

import type { StudyTimerActivityNativeModule } from './StudyTimerActivity.types';

export default requireOptionalNativeModule<StudyTimerActivityNativeModule>('StudyTimerActivity');
