/**
 * Tests for the Live Activity context (composition root): providing and requiring the controller.
 */
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  LiveActivityProvider,
  useLiveActivityController,
} from '@/features/live-activity/live-activity-context';
import { defaultLiveActivityConfig } from '@/features/live-activity/live-activity-config';
import type {
  LiveActivityConfigSource,
  LiveActivityController,
} from '@/features/live-activity/live-activity.types';

/**
 * Creates a controller whose methods are Jest mocks.
 *
 * @returns The spy controller.
 */
function createSpyController(): LiveActivityController {
  return {
    notify: jest.fn(),
    restoreSession: jest.fn(async () => null),
    addPauseChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    whenIdle: jest.fn(async () => {}),
  };
}

/**
 * Creates a config source that records how often it is read.
 *
 * @returns The config source.
 */
function createSpyConfigSource() {
  return {
    getLiveActivityConfig: jest.fn(() => defaultLiveActivityConfig),
  } satisfies LiveActivityConfigSource;
}

/**
 * Builds a renderHook wrapper around LiveActivityProvider.
 *
 * @param providerProps - Overrides to pass to the provider.
 * @returns The wrapper component.
 */
function createProviderWrapper(providerProps: {
  controller?: LiveActivityController;
  configSource?: LiveActivityConfigSource;
}) {
  return function ProviderWrapper({ children }: { children: ReactNode }) {
    return <LiveActivityProvider {...providerProps}>{children}</LiveActivityProvider>;
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

// Requirement: the view model gets its controller from context, so tests and experiments can swap it.
describe('LiveActivityProvider', () => {
  it('provides the controller it was given', async () => {
    const controller = createSpyController();

    const { result } = await renderHook(() => useLiveActivityController(), {
      wrapper: createProviderWrapper({ controller }),
    });

    expect(result.current).toBe(controller);
  });

  it('builds a controller from the config source when none is given', async () => {
    const configSource = createSpyConfigSource();

    const { result } = await renderHook(() => useLiveActivityController(), {
      wrapper: createProviderWrapper({ configSource }),
    });

    expect(configSource.getLiveActivityConfig).toHaveBeenCalledTimes(1);
    expect(result.current.notify).toEqual(expect.any(Function));
  });

  it('keeps the same controller across re-renders', async () => {
    const configSource = createSpyConfigSource();
    const { result, rerender } = await renderHook(() => useLiveActivityController(), {
      wrapper: createProviderWrapper({ configSource }),
    });
    const firstController = result.current;

    await rerender({});

    expect(result.current).toBe(firstController);
    expect(configSource.getLiveActivityConfig).toHaveBeenCalledTimes(1);
  });
});

// Requirement: using the controller outside the provider fails loudly instead of silently doing nothing.
describe('useLiveActivityController', () => {
  it('throws outside LiveActivityProvider', async () => {
    // React logs the render error before rethrowing it; silence that expected noise.
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useLiveActivityController())).rejects.toThrow(
      'useLiveActivityController must be used inside <LiveActivityProvider>.'
    );
  });
});
