import { AnnotationRepository } from '../src/storage/repository';
import { WebCommentDatabase } from '../src/storage/database';
import { isRequest, type Request, type Response } from '../src/messaging/protocol';

export default defineBackground(() => {
  const repo = new AnnotationRepository(new WebCommentDatabase());

  function sitePattern(origin: string): string {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported site');
    return `${url.protocol}//${url.hostname}/*`;
  }

  function scriptId(pattern: string): string {
    let hash = 0;
    for (const char of pattern) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return `web_comment_${Math.abs(hash)}`;
  }

  async function grantSite(origin: string): Promise<boolean> {
    const pattern = sitePattern(origin);
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) return false;
    const id = scriptId(pattern);
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (!existing.length) {
      await chrome.scripting.registerContentScripts([{ id, matches: [pattern], js: ['content-scripts/content.js'], runAt: 'document_idle', persistAcrossSessions: true }]);
    }
    return true;
  }

  chrome.permissions.onRemoved.addListener(async (permissions) => {
    for (const pattern of permissions.origins ?? []) {
      const id = scriptId(pattern);
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
      if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [id] });
    }
  });

  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url?.startsWith('http://') && !tab.url?.startsWith('https://')) {
      if (tab.id) await chrome.action.setBadgeText({ tabId: tab.id, text: 'ERR' });
      return;
    }
    try {
      try {
        await chrome.tabs.sendMessage(tab.id, { channel: 'web-comment-control', type: 'toggle' });
      } catch {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-scripts/content.js'] });
        await chrome.tabs.sendMessage(tab.id, { channel: 'web-comment-control', type: 'toggle' });
      }
      await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    } catch {
      await chrome.action.setBadgeText({ tabId: tab.id, text: 'ERR' });
    }
  });

  chrome.runtime.onMessage.addListener((input: unknown, sender, sendResponse: (response: Response<unknown>) => void) => {
    if (!isRequest(input)) return;
    const message: Request = input;
    const run = async (): Promise<unknown> => {
      if (message.type === 'grantSite') {
        if (!sender.tab?.url || new URL(sender.tab.url).origin !== message.origin) throw new Error('Invalid site');
        return grantSite(message.origin);
      }
      if (!sender.tab?.url) throw new Error('Page sender required');
      const pageUrl = new URL(sender.tab.url);
      if (message.type === 'listPage' && new URL(message.pageUrl).origin !== pageUrl.origin) throw new Error('Invalid page');
      if (message.type === 'createThread' && new URL(message.anchor.pageUrl).origin !== pageUrl.origin) throw new Error('Invalid anchor page');
      switch (message.type) {
        case 'listPage': return repo.listPage(message.pageUrl);
        case 'getThread': return repo.getThread(message.id);
        case 'createThread': return repo.createThread(message.anchor, message.content);
        case 'addComment': return repo.addComment(message.annotationId, message.parentId, message.content);
        case 'editComment': return repo.editComment(message.id, message.content).then(() => null);
        case 'deleteComment': return repo.deleteComment(message.id).then(() => null);
        case 'setStatus': return repo.setStatus(message.id, message.status).then(() => null);
        case 'deleteAnnotation': return repo.deleteAnnotation(message.id).then(() => null);
      }
    };
    run().then((data) => sendResponse({ ok: true, data }), (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }));
    return true;
  });
});
