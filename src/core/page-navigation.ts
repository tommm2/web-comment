import { normalizePageUrl } from '../utils/page-url';

// Isolated content scripts cannot observe page-world History method calls directly.
export function observePageNavigation(onChange: (pageUrl: string) => void): () => void {
  let previous = normalizePageUrl(location.href);
  const check = () => {
    let current: string;
    try { current = normalizePageUrl(location.href); } catch { return; }
    if (current !== previous) {
      previous = current;
      onChange(current);
    }
  };
  const timer = window.setInterval(check, 400);
  window.addEventListener('popstate', check);
  window.addEventListener('hashchange', check);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('popstate', check);
    window.removeEventListener('hashchange', check);
  };
}
