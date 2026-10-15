# Web Comment

A local-first Chrome extension for attaching plain-text discussion threads to elements on ordinary web pages. No account, backend, or changes to the website are required.

## Install for development

Requires Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`. Rebuild and reload the extension after code changes. For live development, run `pnpm dev` and follow WXT's browser runner output.

## Use

1. Open an ordinary `http` or `https` page.
2. Click the Web Comment toolbar icon. Click an element, write a comment, and select **Create annotation**.
3. Click a numbered emerald pin to read the thread, reply, edit, delete, or resolve it. Press Escape to close the thread, then Escape again to leave annotation mode.
4. To show pins automatically after reload, click **Auto restore on this site** while annotation mode is active and approve Chrome's site access prompt. If you decline, click the toolbar icon after each reload; your comments remain stored.

The toolbar badge shows `ERR` when Chrome blocks injection, such as on `chrome://` pages or the Chrome Web Store.

## Data and permissions

The production manifest requires only `activeTab` and `scripting`. It declares `http://*/*` and `https://*/*` as **optional** host permissions. Clicking the toolbar icon gives temporary access to the active tab. Opting into automatic restoration grants persistent access to that site's origin and registers a content script for it.

Comments and anchors live in Dexie/IndexedDB under the extension origin. Content scripts ask the background service worker to access storage through typed messages. The extension contains no external API calls or analytics. Uninstalling the extension removes its local data through Chrome.

Page identity is origin + path + sorted query parameters; URL fragments are ignored. A fork can set `PAGE_IDENTITY_INCLUDE_QUERY` in `src/utils/page-url.ts` to `false` for path-only identity.

## Architecture

- `entrypoints/background.ts`: toolbar action, permission registration, messaging, and storage ownership.
- `entrypoints/content`: one WXT Shadow Root containing React UI and isolated Tailwind styles.
- `src/core`: independent picker, anchor generation/resolution, navigation, and position tracking.
- `src/storage`: Dexie schema version 1 and transactional CRUD.
- `src/messaging`: request/response types and runtime request validation.
- `tests`: Vitest units/integration and Playwright browser flows.

Selectors favor unique IDs and stable attributes. XPath, text, and element features provide fallback. Ambiguous or weak matches become unlocated annotations, listed in the page status panel; they never receive a guessed pin.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

`test:e2e` builds a test-only manifest with access to `127.0.0.1`, since automated Playwright code cannot click Chrome's extension toolbar to grant `activeTab`. Run `pnpm build` afterward to restore the production manifest before loading the extension. The browser tests exercise selection, storage, reload, scroll, SPA routing, orphan handling, and duplicate injection. The actual Chrome toolbar click and optional permission prompt should also be checked manually in an unpacked install.

## Known limits

- Website-owned Shadow DOM and iframes are not annotated.
- A generic element with no reliable text, ID, attribute, or class cannot be safely reattached after reload; it becomes unlocated.
- Text changes may make an annotation unlocated. This avoids attaching comments to unrelated content.
- SPA route changes are detected within 400 ms because isolated content scripts cannot intercept page-world History calls directly.
- Nearby pins get a small offset; dense clusters are not grouped.
- Firefox and Safari are not tested.

No sync, export, SDK, screenshot, or rich-text editor is included in the MVP.
