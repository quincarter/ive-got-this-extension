import { test, expect } from '@playwright/test';
import { setupContentScript, mockResponses } from './e2e-helpers';

test.describe('Trakt — content script injection', () => {
  test('injects Where to Watch item for available movie', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    const wtwItem = page.locator('#media-connector-wtw-item');
    await expect(wtwItem).toBeVisible();
    await expect(wtwItem).toContainText('Emby');
  });

  test('injects legacy action button for available movie', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    const legacyBtn = page.locator('#media-connector-trakt-action-btn');
    await expect(legacyBtn).toBeVisible();
    await expect(legacyBtn).toContainText('Play on Emby');
  });

  test('WTW item is prepended to the list container', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    // Our item should be the first child in the list container
    const firstChild = page.locator('.trakt-list-item-container > :first-child');
    await expect(firstChild).toHaveId('media-connector-wtw-item');
  });

  test('legacy button is inserted before the Check In button', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    const legacyBtn = page.locator('#media-connector-trakt-action-btn');
    const checkinBtn = page.locator('.btn-checkin');

    const legacyBox = await legacyBtn.boundingBox();
    const checkinBox = await checkinBtn.boundingBox();
    expect(legacyBox!.y).toBeLessThan(checkinBox!.y);
  });

  test('shows Request label for unavailable movie', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaUnavailable,
    });

    const wtwItem = page.locator('#media-connector-wtw-item');
    await expect(wtwItem).toBeVisible();
    await expect(wtwItem).toContainText('Request');
  });

  test('shows "Set up" label when unconfigured', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaUnconfigured,
    });

    const wtwItem = page.locator('#media-connector-wtw-item');
    await expect(wtwItem).toBeVisible();
    await expect(wtwItem).toContainText('Set up');
  });

  test('injects elements for a TV series', async ({ page }) => {
    await setupContentScript(page, 'trakt-series.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    const wtwItem = page.locator('#media-connector-wtw-item');
    const legacyBtn = page.locator('#media-connector-trakt-action-btn');
    await expect(wtwItem).toBeVisible();
    await expect(legacyBtn).toBeVisible();
  });

  test('does not duplicate elements on re-injection', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    // Count injected elements — should be exactly one of each
    const wtwCount = await page.locator('#media-connector-wtw-item').count();
    const legacyCount = await page.locator('#media-connector-trakt-action-btn').count();
    expect(wtwCount).toBe(1);
    expect(legacyCount).toBe(1);
  });

  test('regression: available movie shows Play button, not Request', async ({ page }) => {
    await setupContentScript(page, 'trakt-movie.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    const legacyBtn = page.locator('#media-connector-trakt-action-btn');
    await expect(legacyBtn).toBeVisible();
    await expect(legacyBtn).toContainText('Play on Emby');
    await expect(legacyBtn).not.toContainText('Request');

    const wtwItem = page.locator('#media-connector-wtw-item');
    await expect(wtwItem).toBeVisible();
    await expect(wtwItem).not.toContainText('Request');
  });

  test('app.trakt.tv in a non-English UI: sends the year and injects into Where to Watch', async ({
    page,
  }) => {
    await setupContentScript(page, 'trakt-app-show.html', {
      CHECK_MEDIA: mockResponses.checkMediaAvailable,
    });

    const sent = await page.evaluate(
      () =>
        (window as unknown as { __sentMessages: { type: string; payload: unknown }[] })
          .__sentMessages,
    );
    expect(sent.find((m) => m.type === 'CHECK_MEDIA')?.payload).toMatchObject({
      title: 'Менталист',
      year: 2008,
      mediaType: 'series',
    });

    const firstItem = page.locator(
      '.trakt-where-to-watch-list .trakt-list-item-container > :first-child',
    );
    await expect(firstItem).toHaveId('media-connector-wtw-item');
    await expect(firstItem).toContainText('Emby');
  });
});
