import { afterEach, describe, expect, it, vi } from 'vitest';

// Under Node, Lit loads its SSR build: `@customElement` registers in an SSR
// shim, and the shim sets `globalThis.customElements` when it is missing.
// Swap in what the browser build does (define on the global registry), so
// these tests see what the bundled content script sees in Chrome.
vi.mock('lit/decorators.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lit/decorators.js')>()),
  customElement: (tagName: string) => (target: CustomElementConstructor) => {
    customElements.define(tagName, target);
  },
}));

const registryDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'customElements');

describe('search-sidebar registration', () => {
  afterEach(() => {
    if (registryDescriptor) Object.defineProperty(globalThis, 'customElements', registryDescriptor);
    vi.resetModules();
  });

  // Chrome content scripts run in an isolated world where `customElements` is
  // null, and the content script imports this module. Writes are ignored so
  // Lit's shim cannot put a registry back.
  it('loads without a custom element registry, as in a Chrome content script', async () => {
    Object.defineProperty(globalThis, 'customElements', {
      configurable: true,
      get: () => null,
      set: () => {},
    });
    vi.resetModules();

    const mod = await import('./search-sidebar.js');

    expect(mod.SearchSidebar).toBeTypeOf('function');
  });

  it('registers <search-sidebar> when a registry exists', async () => {
    vi.resetModules();

    const mod = await import('./search-sidebar.js');

    expect(customElements.get('search-sidebar')).toBe(mod.SearchSidebar);
  });
});
