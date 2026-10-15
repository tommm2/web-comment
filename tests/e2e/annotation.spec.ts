import { test, expect, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { resolve } from 'node:path';

let context: BrowserContext;
let page: Page;
let worker: Worker;

async function inject() {
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No tab');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-scripts/content.js'] });
    await chrome.tabs.sendMessage(tab.id, { channel: 'web-comment-control', type: 'toggle' });
  });
}

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${resolve('.output/chrome-mv3')}`, `--load-extension=${resolve('.output/chrome-mv3')}`],
  });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/site.html');
});

test.afterAll(async () => { await context?.close(); });

test('creates, restores, edits, replies, resolves, and deletes a thread', async () => {
  await inject();
  await expect(page.getByText('Annotation mode · click an element')).toBeVisible();
  await page.locator('#target').click();
  await expect(page.getByRole('dialog', { name: 'Annotation comments' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Comment' }).fill('Review this button');
  await page.getByRole('button', { name: 'Create annotation' }).click();
  await expect(page.getByText('Review this button')).toBeVisible();
  await page.getByRole('button', { name: 'Close comments' }).click();
  await expect(page.getByRole('button', { name: 'Open annotation 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Auto restore on this site' }).click();
  await expect(page.getByText('Auto restore on', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open annotation 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Open annotation 1' }).click();
  await expect(page.getByText('Review this button')).toBeVisible();

  await page.getByRole('button', { name: 'Reply' }).click();
  await page.getByRole('textbox', { name: 'Reply' }).fill('Looks good');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('Looks good')).toBeVisible();
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByRole('textbox', { name: 'Edit comment' }).fill('Review this control');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Review this control')).toBeVisible();
  page.on('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(page.getByText('Looks good')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resolve' }).click();
  await expect(page.getByText('Annotation · resolved')).toBeVisible();
  await page.getByRole('button', { name: 'Delete annotation' }).click();
  await expect(page.getByRole('button', { name: 'Open annotation 1' })).toHaveCount(0);
});

test('tracks scroll, scopes SPA routes, and marks removed targets as orphaned', async () => {
  await inject();
  await page.locator('#target').hover();
  const highlight = page.locator('.wc-highlight');
  await expect(highlight).toBeVisible();
  const hoverBefore = await highlight.boundingBox();
  await page.evaluate(() => scrollTo(0, 10));
  await expect.poll(async () => (await highlight.boundingBox())?.y).toBeLessThan((hoverBefore?.y ?? 0) - 5);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('#target').click();
  await page.getByRole('textbox', { name: 'Comment' }).fill('Route note');
  await page.getByRole('button', { name: 'Create annotation' }).click();
  await page.getByRole('button', { name: 'Close comments' }).click();
  const pin = page.getByRole('button', { name: 'Open annotation 1' });
  const before = await pin.boundingBox();
  const targetBox = await page.locator('#target').boundingBox();
  expect(before && targetBox && (before.x >= targetBox.x + targetBox.width || before.x + before.width <= targetBox.x)).toBeTruthy();
  await page.evaluate(() => scrollTo(0, 40));
  await expect.poll(async () => (await pin.boundingBox())?.y).toBeLessThan((before?.y ?? 0) - 20);
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole('button', { name: 'Done' }).click();
  await page.locator('#route').click();
  await expect(pin).toHaveCount(0);
  await page.goBack();
  await expect(pin).toBeVisible();
  await page.locator('#target').evaluate((element) => element.remove());
  await expect(page.getByLabel('Unlocated annotations')).toContainText('1 unlocated annotation');
  await expect(pin).toBeHidden();
});

test('does not duplicate the content UI after repeated injection', async () => {
  await inject();
  await inject();
  expect(await page.evaluate(() => [...document.querySelectorAll('[data-web-comment-ui]')].filter((element) => element.shadowRoot).length)).toBe(1);
});
