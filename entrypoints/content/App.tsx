import { useCallback, useEffect, useRef, useState } from 'react';
import { AnnotationPin } from '../../src/components/AnnotationPin';
import { CommentPopover } from '../../src/components/CommentPopover';
import { generateAnchor } from '../../src/core/anchor-generator';
import { resolveAnchor } from '../../src/core/anchor-resolver';
import { ElementPicker } from '../../src/core/element-picker';
import { observePageNavigation } from '../../src/core/page-navigation';
import { PositionTracker } from '../../src/core/position-tracker';
import { request } from '../../src/messaging/client';
import type { Anchor, Annotation, Thread } from '../../src/types/domain';
import { normalizePageUrl } from '../../src/utils/page-url';

export function App({ shadowRoot, initialMode, onReady }: { shadowRoot: ShadowRoot; initialMode: boolean; onReady: () => boolean }) {
  const [mode, setMode] = useState(initialMode);
  const [pageUrl, setPageUrl] = useState(() => normalizePageUrl(location.href));
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Anchor | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [error, setError] = useState('');
  const [siteAccess, setSiteAccess] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (url: string) => {
    try { setAnnotations(await request({ channel: 'web-comment', type: 'listPage', pageUrl: url })); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load annotations'); }
  }, []);

  useEffect(() => {
    void load(pageUrl);
    return observePageNavigation((url) => { setPageUrl(url); setDraft(null); setThread(null); setAnnotations([]); setOrphanIds([]); void load(url); });
  }, [load, pageUrl]);

  useEffect(() => {
    const toggle = () => { setMode((value) => !value); setDraft(null); setThread(null); };
    window.addEventListener('web-comment-toggle', toggle);
    setMode(onReady());
    return () => window.removeEventListener('web-comment-toggle', toggle);
  }, [onReady]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (draft || thread) { setDraft(null); setThread(null); }
      else if (mode) setMode(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [draft, thread, mode]);

  useEffect(() => {
    if (!mode || draft || thread) return;
    const picker = new ElementPicker((element) => {
      const box = highlightRef.current;
      if (!box) return;
      if (!element) { box.style.display = 'none'; return; }
      const rect = element.getBoundingClientRect();
      box.style.display = 'block';
      box.style.left = `${rect.left}px`;
      box.style.top = `${rect.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
    }, (element, point) => {
      setDraft(generateAnchor(element, point, pageUrl));
      setPosition(point);
      setError('');
    });
    picker.start();
    return () => picker.stop();
  }, [mode, draft, thread, pageUrl]);

  useEffect(() => {
    if (!annotations.length) { setOrphanIds([]); return; }
    const update = () => {
      const missing: string[] = [];
      const placed: { x: number; y: number }[] = [];
      annotations.forEach((annotation) => {
        const pin = shadowRoot.querySelector<HTMLElement>(`[data-pin-id="${annotation.id}"]`);
        if (!pin) return;
        const target = resolveAnchor(annotation.anchor);
        const rect = target?.getBoundingClientRect();
        if (!rect || !target?.isConnected || !rect.width || !rect.height) { pin.style.display = 'none'; missing.push(annotation.id); return; }
        if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) { pin.style.display = 'none'; return; }
        const x = rect.left + rect.width * annotation.anchor.offset.x;
        let y = rect.top + rect.height * annotation.anchor.offset.y;
        for (const earlier of placed) if (Math.abs(earlier.x - x) < 26 && Math.abs(earlier.y - y) < 26) y = earlier.y + 28;
        placed.push({ x, y });
        pin.style.display = 'grid';
        pin.style.left = `${Math.min(window.innerWidth - 28, Math.max(4, x))}px`;
        pin.style.top = `${Math.min(window.innerHeight - 28, Math.max(4, y))}px`;
      });
      setOrphanIds((previous) => previous.join() === missing.join() ? previous : missing);
    };
    const tracker = new PositionTracker(update);
    tracker.start();
    return () => tracker.stop();
  }, [annotations, shadowRoot]);

  const refreshThread = async (id: string) => {
    setThread(await request({ channel: 'web-comment', type: 'getThread', id }));
    await load(pageUrl);
  };

  const perform = async (task: () => Promise<void>) => {
    try { await task(); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Operation failed'); }
  };

  return <div className="wc-root" data-web-comment-ui="">
    <div ref={highlightRef} className="wc-highlight" aria-hidden="true" />
    {annotations.map((annotation, index) => <AnnotationPin key={annotation.id} annotation={annotation} number={index + 1} onClick={() => void perform(async () => {
      const item = await request({ channel: 'web-comment', type: 'getThread', id: annotation.id });
      if (!item) return;
      setThread(item);
      const pin = shadowRoot.querySelector<HTMLElement>(`[data-pin-id="${annotation.id}"]`);
      const rect = pin?.getBoundingClientRect();
      if (rect) setPosition({ x: rect.left, y: rect.top });
    })} />)}
    {mode && <div className="wc-toolbar" role="status"><span>Annotation mode · click an element</span><button type="button" onClick={() => setMode(false)}>Done</button><button type="button" onClick={() => void perform(async () => { const allowed = await request({ channel: 'web-comment', type: 'grantSite', origin: location.origin }); setSiteAccess(allowed); })}>{siteAccess ? 'Auto restore on' : 'Auto restore on this site'}</button></div>}
    {orphanIds.length > 0 && <aside className="wc-orphans" aria-label="Unlocated annotations">{orphanIds.length} unlocated annotation{orphanIds.length === 1 ? '' : 's'}{orphanIds.map((id) => <span key={id}><button type="button" onClick={() => void perform(async () => { setThread(await request({ channel: 'web-comment', type: 'getThread', id })); setPosition({ x: 40, y: Math.max(20, innerHeight - 470) }); })}>Open</button><button type="button" onClick={() => void perform(async () => { await request({ channel: 'web-comment', type: 'deleteAnnotation', id }); await load(pageUrl); })}>Delete</button></span>)}</aside>}
    {(draft || thread) && <CommentPopover key={thread?.annotation.id ?? 'draft'} thread={thread} position={position} error={error} onClose={() => { setDraft(null); setThread(null); setError(''); }} onSubmit={async (content, parentId) => {
      try {
        if (draft) {
          const created = await request({ channel: 'web-comment', type: 'createThread', anchor: draft, content });
          setDraft(null); setThread(created); await load(pageUrl);
        } else if (thread) {
          await request({ channel: 'web-comment', type: 'addComment', annotationId: thread.annotation.id, parentId, content });
          await refreshThread(thread.annotation.id);
        }
        setError('');
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save comment'); throw cause; }
    }} onEdit={async (id, content) => { if (!thread) return; await perform(async () => { await request({ channel: 'web-comment', type: 'editComment', id, content }); await refreshThread(thread.annotation.id); }); }} onDelete={async (id) => { if (!thread) return; await perform(async () => { await request({ channel: 'web-comment', type: 'deleteComment', id }); await refreshThread(thread.annotation.id); }); }} onStatus={async () => { if (!thread) return; await perform(async () => { await request({ channel: 'web-comment', type: 'setStatus', id: thread.annotation.id, status: thread.annotation.status === 'open' ? 'resolved' : 'open' }); await refreshThread(thread.annotation.id); }); }} onDeleteAnnotation={async () => { if (!thread) return; await perform(async () => { await request({ channel: 'web-comment', type: 'deleteAnnotation', id: thread.annotation.id }); setThread(null); await load(pageUrl); }); }} />}
    {error && !draft && !thread && <div className="wc-toast" role="alert">{error}</div>}
  </div>;
}
