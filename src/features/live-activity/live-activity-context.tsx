/**
 * Live Activity context (composition root for the Model layer, exposed through React context).
 * Resolves the Live Activity strategy once per launch and provides the resulting controller to the
 * study timer view model. Mounted in src/app/_layout.tsx. Tests pass their own controller.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

import { createLiveActivityController } from '@/features/live-activity/create-live-activity-controller';
import { staticLiveActivityConfigSource } from '@/features/live-activity/live-activity-config';
import type {
  LiveActivityConfigSource,
  LiveActivityController,
} from '@/features/live-activity/live-activity.types';
import { resolveLiveActivityStrategy } from '@/features/live-activity/resolve-live-activity-strategy';

/** Holds the controller. Null outside LiveActivityProvider. */
const LiveActivityControllerContext = createContext<LiveActivityController | null>(null);

/** Props for LiveActivityProvider. Both overrides are read on the first render only. */
export type LiveActivityProviderProps = {
  children: ReactNode;
  /** Controller to provide instead of building one from config. Tests pass a spy here. */
  controller?: LiveActivityController;
  /** Where the config comes from. Defaults to the static source. */
  configSource?: LiveActivityConfigSource;
};

/**
 * Provides the Live Activity controller to everything below it.
 *
 * @param props - Children plus optional controller or config source overrides.
 */
export function LiveActivityProvider({
  children,
  controller,
  configSource = staticLiveActivityConfigSource,
}: LiveActivityProviderProps) {
  // Built lazily, exactly once, so a running session never switches strategy midway, even if
  // props change.
  const [providedController] = useState(
    () => controller ?? createControllerFromConfig(configSource)
  );
  return (
    <LiveActivityControllerContext value={providedController}>{children}</LiveActivityControllerContext>
  );
}

/**
 * Returns the Live Activity controller from the nearest LiveActivityProvider.
 *
 * @returns The controller.
 * @throws Error when called outside LiveActivityProvider.
 */
export function useLiveActivityController(): LiveActivityController {
  const controller = useContext(LiveActivityControllerContext);
  if (controller === null) {
    throw new Error('useLiveActivityController must be used inside <LiveActivityProvider>.');
  }
  return controller;
}

/**
 * Resolves the configured strategy and wraps it in a controller.
 *
 * @param configSource - Supplies the config for this launch.
 * @returns A controller for the resolved strategy.
 */
function createControllerFromConfig(configSource: LiveActivityConfigSource): LiveActivityController {
  const strategy = resolveLiveActivityStrategy(configSource.getLiveActivityConfig());
  return createLiveActivityController({ strategy });
}
