# Web Comment MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an unpacked Chrome extension that stores DOM anchored comment threads locally and restores them reliably.

**Architecture:** WXT background owns Dexie and action/permission lifecycle. A runtime content script mounts one Shadow Root and delegates picker, anchor, navigation, and position logic to pure TypeScript modules. Typed messages cross the content/background boundary.

**Tech Stack:** WXT, React, strict TypeScript, Tailwind CSS, Dexie, Vitest, fake-indexeddb, Playwright, MV3.

**Spec:** `docs/superpowers/specs/2026-10-16-web-comment-design.md`

## Global Constraints

- Required permissions: `activeTab`, `scripting`; optional host permissions: `http://*/*`, `https://*/*`.
- No backend, accounts, network requests, or site-origin IndexedDB.
- Page identity includes sorted query parameters by default; ignores fragment.
- Anchor resolution must be conservative; unresolved items are orphaned.
- Extension UI uses one Shadow Root and emerald `#10b981`, pin `#047857`, focus `#34d399`.
- Keep event listeners and observers scoped to mounted UI and active mode.

## Review Focus

- Restricted URLs: action reports failure without a stale ON badge (Task 5 E2E).
- Duplicate injection: one host and one picker instance after repeated clicks (Task 5 E2E).
- Ambiguous anchor candidates: annotation becomes orphaned (Task 2 unit).
- Deleting a parent reply: descendants are removed atomically (Task 3 integration).
- SPA route change and browser back: pins are scoped to the current identity (Task 5 E2E).

---

### Task 1: Foundation and Page Identity

**Files:** Create `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `src/utils/page-url.ts`, `tests/unit/page-url.test.ts`.

**Interfaces:** Produce `normalizePageUrl(url: string, includeQuery?: boolean): string`.

- [ ] Write page URL tests for sorted query, fragment removal, and query exclusion.
- [ ] Run `pnpm test tests/unit/page-url.test.ts`; expect failure for missing module.
- [ ] Configure dependencies and implement `normalizePageUrl`.
- [ ] Run `pnpm test tests/unit/page-url.test.ts`; expect pass.
- [ ] Run `pnpm typecheck`; expect pass.
- [ ] Commit `feat: establish web comment foundation`.

### Task 2: Anchor and Picker Core

**Files:** Create `src/types/domain.ts`, `src/core/anchor-generator.ts`, `src/core/anchor-resolver.ts`, `src/core/element-picker.ts`, `src/core/position-tracker.ts`, `tests/unit/anchor.test.ts`, `tests/unit/element-picker.test.ts`.

**Interfaces:** Produce `generateAnchor(element: Element, point: {x:number;y:number}, pageUrl:string): Anchor`, `resolveAnchor(anchor: Anchor, root?: Document): Element | null`, `ElementPicker`, `PositionTracker`.

- [ ] Write anchor tests for stable selector, XPath fallback, offset, and ambiguous candidate rejection.
- [ ] Run targeted tests; expect missing module failure.
- [ ] Implement domain types and anchor modules; run targeted tests; expect pass.
- [ ] Write picker tests for UI exclusion and cleanup; run and expect failure.
- [ ] Implement picker and position tracker; run targeted and full unit tests; expect pass.
- [ ] Commit `feat: add annotation anchor and picker core`.

### Task 3: Local Storage and Messaging

**Files:** Create `src/storage/database.ts`, `src/storage/repository.ts`, `src/messaging/protocol.ts`, `src/messaging/client.ts`, `tests/integration/storage.test.ts`, `tests/unit/protocol.test.ts`.

**Interfaces:** Produce `AnnotationRepository` with page query, create thread, add/edit/delete comment, update status, delete annotation; typed `request()` client and `handleRequest()` background handler.

- [ ] Write storage tests for CRUD, page query, cascade delete, and parent reply deletion.
- [ ] Run targeted tests; expect failure.
- [ ] Implement Dexie schema v1 and repository; run targeted tests; expect pass.
- [ ] Write protocol validation tests, then implement message types and runtime guard.
- [ ] Run full tests and typecheck; expect pass.
- [ ] Commit `feat: persist local annotation threads`.

### Task 4: Extension UI and Lifecycle

**Files:** Create `entrypoints/background.ts`, `entrypoints/content/index.tsx`, `entrypoints/content/style.css`, `entrypoints/content/App.tsx`, `src/components/CommentPopover.tsx`, `src/components/CommentThread.tsx`, `src/components/AnnotationPin.tsx`, `src/core/page-navigation.ts`.

**Interfaces:** Background handles action and storage protocol; content mounts one Shadow Root and receives toggle command; App renders picker/highlight/pins/thread/orphan list.

- [ ] Write navigation tests for push, replace, popstate, and cleanup; expect failure.
- [ ] Implement navigation observer; run targeted tests; expect pass.
- [ ] Implement WXT runtime content script, background action/permission lifecycle, and UI.
- [ ] Run `pnpm typecheck`, `pnpm lint`, `pnpm build`; fix all failures.
- [ ] Commit `feat: connect extension UI and annotation lifecycle`.

### Task 5: Browser E2E and Open Source Delivery

**Files:** Create `playwright.config.ts`, `tests/e2e/annotation.spec.ts`, `tests/fixtures/site.html`, `tests/fixtures/server.ts`, `README.md`, `CONTRIBUTING.md`, `LICENSE`.

**Interfaces:** `pnpm test:e2e` launches extension and fixture; README documents install, permissions, limitations.

- [ ] Write E2E for action toggle, selection, create/reload, pin movement, CRUD, SPA, orphan, duplicate injection, and restricted URLs.
- [ ] Run E2E and observe failing behavior; implement fixes until pass.
- [ ] Document local development and unpacked Chrome installation.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`; record results.
- [ ] Commit `docs: prepare web comment for contributors`.
