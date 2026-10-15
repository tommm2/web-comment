# Web Comment MVP Design

## Intent

Build an open-source, local-first Chrome extension that lets a user select a DOM element on a normal web page, attach a discussion, reopen it from a pin, and recover it after navigation or reload. The extension requires no account, backend, or target-site source changes.

Success means a user can load the unpacked extension, enable annotation mode, create and manage comments, resolve an annotation, and recover reliable anchors from local browser storage.

## Scope

### Included

- Chrome Manifest V3 extension built with WXT, React, strict TypeScript, Tailwind CSS, Dexie, Vitest, and Playwright.
- Toolbar action that toggles annotation mode on the active tab.
- Optional per-origin host permission for automatic restoration after reload.
- DOM element picker, highlight, robust anchors, pins, comment threads, local persistence, SPA navigation, orphan handling, and basic accessibility.
- Open-source project documentation, MIT license, build scripts, and executable tests.

### Excluded

- iframes and elements inside website-owned Shadow DOM.
- Accounts, cloud sync, collaboration, backend APIs, npm SDK, and JSON export.
- Rich text, screenshots, and sophisticated pin clustering.
- Firefox and Safari runtime certification.

## Permission Model

The required permissions are `activeTab` and `scripting`. The manifest declares `http://*/*` and `https://*/*` as optional host permissions.

Clicking the extension action grants temporary access through `activeTab` and injects the content script when needed. A user can separately grant the current origin persistent access. WXT then registers or enables content-script behavior for granted origins so annotations restore after reload. Without persistent permission, annotations remain stored, but the user must click the action again after reload.

The extension must reject unsupported URLs, including `chrome://` pages, the Chrome Web Store, and other browser-restricted pages. It must show a clear badge or extension error rather than retrying injection.

## Architecture

### Entry Points

- `entrypoints/background.ts` owns action clicks, permission flows, content-script injection, typed message handling, and storage operations.
- `entrypoints/content/index.tsx` creates one WXT Shadow Root and coordinates annotation mode, navigation, pins, popovers, and teardown.
- A popup or permission prompt UI explains persistent per-site access. It does not become a second annotation application.

The content script uses a symbol on `globalThis` to prevent duplicate mounts. All mounts and event listeners have matching cleanup paths.

### Modules

- `src/core/element-picker.ts`: framework-independent hit testing and selection lifecycle.
- `src/core/anchor-generator.ts`: stable anchor construction.
- `src/core/anchor-resolver.ts`: conservative candidate lookup and scoring.
- `src/core/position-tracker.ts`: frame-batched element position updates.
- `src/components`: React highlight shell, pins, popover, thread, permission notice, and orphan list.
- `src/storage`: Dexie schema, migrations, and transactional repository.
- `src/messaging`: discriminated request and response unions plus runtime validation at the trust boundary.
- `src/types`: shared domain types.
- `src/utils`: URL normalization and small browser utilities.

Dexie runs only in the extension service worker context. Content scripts never open a site-origin IndexedDB database. Every storage operation crosses the typed messaging boundary.

## Interaction Flow

1. The toolbar action injects the content script if absent, then toggles annotation mode.
2. Annotation mode starts the element picker. Disabled mode runs no pointer hit-testing loop.
3. `pointermove` records the latest coordinates. At most once per animation frame, the picker calls `document.elementFromPoint()` and updates the highlight.
4. The picker excludes the extension Shadow Root host and any path marked `data-web-comment-ui`.
5. Clicking a valid page element freezes selection, creates a draft anchor, and opens the comment popover.
6. Submitting the first comment sends one command to the background. One Dexie transaction creates the annotation and comment.
7. The content script renders a pin only after persistence succeeds.
8. Clicking a pin opens its thread. Users can add replies, edit or delete comments, and change Open or Resolved status.
9. Escape closes the active popover or cancels a selection first. A subsequent Escape exits annotation mode.

React owns semantic UI state. High-frequency highlight and pin coordinates update element styles directly through focused controllers, avoiding full-tree renders.

## Element Picker and Positioning

The picker is a TypeScript class with explicit `start()`, `stop()`, and selection callbacks. The overlay uses `position: fixed`, `pointer-events: none`, and `getBoundingClientRect()`, so viewport coordinates remain correct during scroll.

Scroll and resize listeners only mark tracked items dirty. A bounded `MutationObserver` watches document layout changes and schedules one position pass; it does not query on every mutation. Position tracking resolves only known annotations and stops tracking detached or hidden targets.

Nearby pins receive deterministic small vertical offsets to prevent complete overlap. Pins remain clickable while their container avoids covering the annotated element. Missing elements never retain stale coordinates.

## Anchor Model

Each anchor stores:

- normalized page URL;
- stable CSS selector;
- XPath fallback;
- optional exact text quote with short prefix and suffix context;
- click offset as normalized `x` and `y` values in the `0..1` range;
- tag name, role, accessible name where available, selected stable attributes, class hints, text summary, and ancestor hints.

Selector generation prefers, in order, a unique stable ID, test or semantic attributes, a stable attribute and class combination, then a short ancestor path. Generated selectors avoid positional pseudo-classes unless no safer discriminator exists.

Resolution proceeds through CSS, XPath, then bounded text and feature search. Candidates receive scores for tag, attributes, text, ancestor context, visibility, and uniqueness. A candidate resolves only when it passes an absolute confidence threshold and beats the second candidate by a required margin. Otherwise the annotation becomes orphaned. The resolver never attaches to the nearest arbitrary element.

## Page Identity and Navigation

Default page identity is normalized origin plus pathname and sorted query parameters. URL fragments are ignored. One configuration constant controls whether query parameters participate, without introducing a user-facing settings system in MVP.

The content script observes `history.pushState`, `history.replaceState`, `popstate`, and `hashchange`. When identity changes, it cancels pending resolution, removes old pins, loads annotations for the new identity, and resolves them against the current DOM.

## Data Model

`Annotation` contains `id`, `pageUrl`, `anchor`, `status`, `createdAt`, and `updatedAt`.

`Comment` contains `id`, `annotationId`, nullable `parentId`, `content`, `createdAt`, and `updatedAt`.

IDs use `crypto.randomUUID()`. Timestamps are ISO strings. Status is the union `open | resolved`. Comment content must be non-empty after trimming and has a documented maximum length.

Dexie schema version 1 provides:

- `annotations: id, pageUrl, status, createdAt, updatedAt`
- `comments: id, annotationId, parentId, createdAt, updatedAt`

Deleting an annotation cascades to all comments in one transaction. Deleting a comment also deletes its descendant replies in one transaction. Deleting the last top-level comment does not implicitly delete the annotation. Schema changes require a new Dexie version and an explicit migration function.

The service worker stores no required state only in memory. It can reopen the database and serve any request after termination.

## UI and Accessibility

All extension UI lives in one Shadow Root. Tailwind styles are injected only into that root. A shared layering constant controls z-index values.

- Highlight: 2 px emerald `#10b981` outline with a light translucent fill.
- Pin: 24 px dark emerald `#047857` circle with a white number.
- Focus ring: emerald `#34d399`.
- Popover: about 320 px wide, viewport constrained, and automatically flipped away from edges.
- Dark mode follows `prefers-color-scheme` and increases outline and surface contrast.

Controls have accessible names, visible focus, keyboard navigation, and appropriate ARIA state. User and page text renders as React text, never through `dangerouslySetInnerHTML`.

Orphan annotations do not display pins. A compact status panel lists them and lets the user inspect or delete them.

## Error Handling

- Injection failures distinguish restricted pages, missing permission, and unexpected runtime errors.
- Message requests and responses use explicit success and failure variants.
- Failed persistence leaves no optimistic pin behind and preserves entered text for retry.
- Resolver failures produce orphan state, not a guessed target.
- Missing or terminated service workers are handled through normal message retry initiated by user action; no essential background timer is assumed.

## Test Strategy

Vitest with jsdom covers URL normalization, selector construction, anchor generation, candidate scoring, conservative resolution, page identity, and domain validation.

Vitest with `fake-indexeddb` covers Dexie create, read, update, page query, comment hierarchy, cascade deletion, and schema migration behavior.

Playwright launches a persistent Chromium context with the unpacked production extension and a local fixture site. E2E scenarios cover:

- enabling annotation mode;
- hovering and selecting an element;
- adding a comment and rendering a pin;
- reopening a thread, replying, editing, deleting, and resolving;
- restoring after reload;
- updating pin position after scroll and resize;
- SPA push, replace, back, and forward navigation;
- marking a removed or substantially changed element as orphaned;
- preventing duplicate content-script mounts.

Release verification runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`. A check is reported as passing only when its command completes successfully in the current environment.

## Delivery Phases

1. Foundation: WXT React TypeScript project, Tailwind Shadow DOM styling, linting, formatting, Vitest, Playwright, basic injection.
2. Annotation engine: picker, highlight, anchors, resolver, position tracker, and pins.
3. Comment system: Dexie repository, messaging, popover, thread, and CRUD.
4. Reliability: navigation, mutation handling, orphan state, permission errors, and cleanup.
5. Open-source readiness: README, MIT license, contributing guide, install instructions, and final verification.

## Repository Shape

```text
web-comment/
├── entrypoints/
│   ├── background.ts
│   ├── content/
│   │   ├── index.tsx
│   │   └── style.css
│   └── popup/
├── src/
│   ├── core/
│   ├── components/
│   ├── hooks/
│   ├── messaging/
│   ├── storage/
│   ├── types/
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── docs/superpowers/specs/
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── package.json
├── playwright.config.ts
└── wxt.config.ts
```

This follows WXT file-based entrypoints while keeping reusable logic outside entrypoint bundles.
