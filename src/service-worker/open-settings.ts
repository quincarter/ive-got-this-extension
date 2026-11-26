import { Effect } from 'effect';

/** The browser calls `openSettingsEffect` needs, injectable for tests. */
export interface OpenSettingsDeps {
  readonly openPopup: () => Promise<void>;
  readonly openTab: (url: string) => Promise<unknown>;
  readonly popupUrl: string;
}

export const chromeOpenSettingsDeps = (): OpenSettingsDeps => ({
  openPopup: () => chrome.action.openPopup(),
  openTab: (url) => chrome.tabs.create({ url }),
  popupUrl: chrome.runtime.getURL('popup.html'),
});

export type OpenSettingsResult =
  | {
      readonly type: 'OPEN_SETTINGS_RESPONSE';
      readonly payload: { readonly opened: 'popup' | 'tab' };
    }
  | { readonly type: 'ERROR'; readonly payload: { readonly message: string } };

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Open the extension's settings for a button on a page (the search sidebar).
 *
 * Content scripts can't open the popup themselves, so they ask the service worker.
 * `chrome.action.openPopup()` opens the real popup under the toolbar icon (Chrome 127+);
 * it rejects where Chrome can't show it (no focused normal window, older Chrome), and then
 * the same page opens in a tab instead.
 */
export const openSettingsEffect = (deps: OpenSettingsDeps): Effect.Effect<OpenSettingsResult> =>
  Effect.tryPromise({ try: () => deps.openPopup(), catch: errorMessage }).pipe(
    Effect.as<OpenSettingsResult>({
      type: 'OPEN_SETTINGS_RESPONSE',
      payload: { opened: 'popup' },
    }),
    Effect.catchAll(() =>
      Effect.tryPromise({ try: () => deps.openTab(deps.popupUrl), catch: errorMessage }).pipe(
        Effect.as<OpenSettingsResult>({
          type: 'OPEN_SETTINGS_RESPONSE',
          payload: { opened: 'tab' },
        }),
      ),
    ),
    Effect.catchAll((message) =>
      Effect.succeed<OpenSettingsResult>({ type: 'ERROR', payload: { message } }),
    ),
  );
