import './style.css';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const INSTANCE = Symbol.for('web-comment.content-instance');

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    const state = globalThis as unknown as Record<symbol, { toggle: () => void } | undefined>;
    if (state[INSTANCE]) return;
    let ready = false;
    let initialMode = false;
    state[INSTANCE] = { toggle: () => {
      if (ready) window.dispatchEvent(new Event('web-comment-toggle'));
      else initialMode = !initialMode;
    } };
    const listener = (message: unknown, _sender: chrome.runtime.MessageSender, respond: (value: unknown) => void) => {
      if (message && typeof message === 'object' && 'channel' in message && message.channel === 'web-comment-control' && 'type' in message && message.type === 'toggle') {
        state[INSTANCE]?.toggle();
        respond({ ok: true });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    try {
      const ui = await createShadowRootUi(ctx, {
        name: 'web-comment',
        position: 'inline',
        anchor: 'body',
        onMount(container) {
          const shadowRoot = container.getRootNode() as ShadowRoot;
          const host = shadowRoot.host as HTMLElement;
          host.dataset.webCommentUi = '';
          host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
          const app = document.createElement('div');
          container.append(app);
          const root = ReactDOM.createRoot(app);
          root.render(<App shadowRoot={shadowRoot} initialMode={initialMode} onReady={() => { ready = true; return initialMode; }} />);
          return root;
        },
        onRemove(root) { root?.unmount(); },
      });
      ui.mount();
      ctx.onInvalidated(() => { ui.remove(); chrome.runtime.onMessage.removeListener(listener); delete state[INSTANCE]; });
    } catch (error) {
      chrome.runtime.onMessage.removeListener(listener);
      delete state[INSTANCE];
      throw error;
    }
  },
});
