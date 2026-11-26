import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import { openSettingsEffect, type OpenSettingsDeps } from './open-settings.js';

const POPUP_URL = 'chrome-extension://abc/popup.html';

const deps = (overrides: Partial<OpenSettingsDeps> = {}): OpenSettingsDeps => ({
  openPopup: vi.fn(async () => undefined),
  openTab: vi.fn(async () => ({})),
  popupUrl: POPUP_URL,
  ...overrides,
});

describe('openSettingsEffect', () => {
  it('opens the popup when Chrome allows it', async () => {
    const d = deps();
    const result = await Effect.runPromise(openSettingsEffect(d));

    expect(result).toEqual({ type: 'OPEN_SETTINGS_RESPONSE', payload: { opened: 'popup' } });
    expect(d.openTab).not.toHaveBeenCalled();
  });

  it('opens the settings in a tab when the popup is refused', async () => {
    const d = deps({
      openPopup: vi.fn(async () => {
        throw new Error('Could not find an active browser window.');
      }),
    });
    const result = await Effect.runPromise(openSettingsEffect(d));

    expect(result).toEqual({ type: 'OPEN_SETTINGS_RESPONSE', payload: { opened: 'tab' } });
    expect(d.openTab).toHaveBeenCalledWith(POPUP_URL);
  });

  it('opens a tab where openPopup does not exist (older Chrome)', async () => {
    const d = deps({
      openPopup: () => {
        throw new TypeError('chrome.action.openPopup is not a function');
      },
    });
    const result = await Effect.runPromise(openSettingsEffect(d));

    expect(result).toEqual({ type: 'OPEN_SETTINGS_RESPONSE', payload: { opened: 'tab' } });
  });

  it('reports an error when neither works', async () => {
    const d = deps({
      openPopup: vi.fn(async () => {
        throw new Error('no window');
      }),
      openTab: vi.fn(async () => {
        throw new Error('tabs.create failed');
      }),
    });
    const result = await Effect.runPromise(openSettingsEffect(d));

    expect(result).toEqual({ type: 'ERROR', payload: { message: 'tabs.create failed' } });
  });
});
