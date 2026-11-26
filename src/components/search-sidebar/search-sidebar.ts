import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { property } from 'lit/decorators.js';
import {
  COMBINED_SVG,
  buildStatusBadge,
  openExtensionSettings,
  openInNewTab,
  requestFromSidebar,
} from '../../content-scripts/common-ui.js';
import type { SearchJellyseerrResponse, JellyseerrResultItem } from '../../types/messages.js';

export class SearchSidebar extends LitElement {
  @property({ type: Object })
  response?: SearchJellyseerrResponse;

  @property({ type: String })
  queryTitle: string = '';

  static styles = css`
    :host {
      display: block;
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(145deg, #1a1130 0%, #120d20 100%);
      border: 1px solid rgba(123, 47, 190, 0.35);
      border-radius: 16px;
      padding: 20px;
      color: #e8e0f0;
      max-width: 360px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
      margin-block: 1rem;
      font-size: 14px;
      line-height: 1.5;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .header-icon {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-title {
      font-weight: 700;
      font-size: 15px;
      color: #d0bcff;
    }

    .header-subtitle {
      font-size: 11px;
      color: #a89cc0;
      margin-top: 2px;
    }

    .settings-btn {
      margin-left: auto;
      align-self: flex-start;
      padding: 4px 7px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #a89cc0;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s;
    }

    .settings-btn:hover,
    .settings-btn:focus-visible {
      background: rgba(255, 255, 255, 0.08);
      color: #d0bcff;
    }

    .info-row .open-settings {
      margin-top: 8px;
      padding: 5px 12px;
      border: none;
      border-radius: 6px;
      background: #7b2fbe;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
      cursor: pointer;
    }

    .info-row .open-settings:hover {
      background: #5e1f9b;
    }

    .result-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      align-items: flex-start;
    }

    .result-row:not(:first-of-type) {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 12px;
    }

    .poster {
      width: 60px;
      min-width: 60px;
      height: 90px;
      border-radius: 8px;
      overflow: hidden;
      background: #2a2040;
      flex-shrink: 0;
    }

    .poster img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .poster-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .title {
      font-weight: 600;
      font-size: 14px;
      color: #f0e8ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .type-label {
      font-size: 11px;
      color: #a89cc0;
    }

    .actions {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .info-row {
      padding: 8px 0;
    }

    .info-row-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .info-row-desc {
      font-size: 12px;
      color: #a89cc0;
    }
  `;

  render() {
    if (!this.response) return nothing;

    const { results, jellyseerrEnabled, serverType, error } = this.response.payload;
    const serverLabel = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby';

    return html`
      <div class="header">
        <div class="header-icon">
          ${unsafeHTML(COMBINED_SVG.replace(/width="48" height="48"/, 'width="32" height="32"'))}
        </div>
        <div>
          <div class="header-title">I've got this!</div>
          <div class="header-subtitle">Powered by Jellyseerr · ${serverLabel}</div>
        </div>
        <button
          class="settings-btn"
          title="Extension settings"
          aria-label="Extension settings"
          @click="${this._openSettings}"
        >
          ⚙︎
        </button>
      </div>

      ${!jellyseerrEnabled
        ? this._renderInfoRow(
            '⚙️',
            'Jellyseerr not configured',
            'Set your Jellyseerr URL and API key in the extension settings.',
            html`<button class="open-settings" @click="${this._openSettings}">
              Open settings
            </button>`,
          )
        : error
          ? this._renderInfoRow('⚠️', 'Connection error', error)
          : results.length === 0
            ? this._renderInfoRow(
                '🔍',
                'No results',
                `"${this.queryTitle}" was not found on Jellyseerr.`,
              )
            : results.map((item) => this._renderResultRow(item, serverLabel))}
    `;
  }

  private _renderInfoRow(emoji: string, title: string, desc: string, action?: unknown) {
    return html`
      <div class="info-row">
        <div class="info-row-title">${emoji} ${title}</div>
        <div class="info-row-desc">${desc}</div>
        ${action ?? nothing}
      </div>
    `;
  }

  private _openSettings() {
    void openExtensionSettings();
  }

  private _renderResultRow(item: JellyseerrResultItem, serverLabel: string) {
    const typeLabel = item.mediaType === 'movie' ? 'Movie' : 'TV Show';
    const yearStr = item.year ? ` (${item.year})` : '';
    const jellyseerrUrl = this.response?.payload.jellyseerrUrl;

    return html`
      <div class="result-row">
        <div class="poster">
          ${item.posterUrl
            ? html`<img src="${item.posterUrl}" alt="${item.title}" />`
            : html`<div class="poster-placeholder">🎬</div>`}
        </div>
        <div class="info">
          <div class="title" title="${item.title}${yearStr}">${item.title}${yearStr}</div>
          <div class="type-label">${typeLabel}</div>
          ${unsafeHTML(buildStatusBadge(item.status))}
          <div class="actions">${this._renderActions(item, serverLabel, jellyseerrUrl)}</div>
        </div>
      </div>
    `;
  }

  private _renderActions(item: JellyseerrResultItem, serverLabel: string, jellyseerrUrl?: string) {
    const isJellyfin = serverLabel === 'Jellyfin';
    const serverBtnBg = isJellyfin ? '#00A4DC' : '#4CAF50';

    if (item.status === 'available' || item.status === 'partial') {
      return html`
        ${item.serverItemUrl
          ? html`<button
              @click="${() => window.open(item.serverItemUrl, '_blank')}"
              style="display: inline-block; padding: 5px 12px; border: none; border-radius: 6px; background: ${serverBtnBg}; color: #fff; fontSize: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; line-height: 1.4;"
            >
              ▶ Play on ${serverLabel}
            </button>`
          : nothing}
        ${jellyseerrUrl
          ? html`<button
              @click="${() => this._openJellyseerr(jellyseerrUrl, item)}"
              style="display: inline-block; padding: 5px 12px; border: none; border-radius: 6px; background: #7B2FBE; color: #fff; fontSize: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; line-height: 1.4;"
            >
              Manage in Jellyseerr
            </button>`
          : nothing}
      `;
    }

    if (item.status === 'pending' || item.status === 'processing') {
      return html`
        <button
          @click="${() => jellyseerrUrl && this._openJellyseerr(jellyseerrUrl, item)}"
          style="display: inline-block; padding: 5px 12px; border: none; border-radius: 6px; background: #616161; color: #fff; fontSize: 12px; font-weight: 600; cursor: ${jellyseerrUrl
            ? 'pointer'
            : 'default'}; transition: background 0.15s; line-height: 1.4;"
        >
          ⏳ Request Pending
        </button>
      `;
    }

    return html`
      <button
        @click="${(e: Event) => this._handleRequest(e, item, serverLabel)}"
        style="display: inline-block; padding: 5px 12px; border: none; border-radius: 6px; background: #7B2FBE; color: #fff; fontSize: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; line-height: 1.4;"
      >
        ＋ Request
      </button>
    `;
  }

  private _openJellyseerr(baseUrl: string, item: JellyseerrResultItem) {
    const slug = item.mediaType === 'movie' ? 'movie' : 'tv';
    // Through the service worker, like the cards on other sites. This used to be a
    // `media-connector-open-tab` window event that nothing in the content script listened
    // to, so the button did nothing in the extension.
    void openInNewTab(`${baseUrl}/${slug}/${item.id}`);
  }

  private async _handleRequest(e: Event, item: JellyseerrResultItem, _serverLabel: string) {
    const btn = e.target as HTMLButtonElement;
    const originalText = btn.textContent;
    btn.textContent = 'Requesting…';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';

    const ok = await requestFromSidebar(item);
    if (ok) {
      btn.textContent = '✓ Requested!';
      btn.style.background = '#4CAF50';
    } else {
      btn.textContent = '✗ Failed';
      btn.style.background = '#c62828';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#7B2FBE';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }, 3000);
    }
  }
}

const nothing = html``;

// This module is bundled into the content script. Chrome gives content
// scripts no custom element registry (`customElements` is null in the
// isolated world), so `@customElement` threw on import and took the whole
// content script down on every site. Register only where a registry exists.
if (globalThis.customElements && !globalThis.customElements.get('search-sidebar')) {
  globalThis.customElements.define('search-sidebar', SearchSidebar);
}

declare global {
  interface HTMLElementTagNameMap {
    'search-sidebar': SearchSidebar;
  }
}
