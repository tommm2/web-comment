import { useEffect, useState } from 'react';
import type { Thread } from '../types/domain';
import { CommentThread } from './CommentThread';

export function CommentPopover({ thread, position, error, onClose, onSubmit, onEdit, onDelete, onStatus, onDeleteAnnotation }: {
  thread: Thread | null;
  position: { x: number; y: number };
  error: string;
  onClose: () => void;
  onSubmit: (content: string, parentId: string | null) => Promise<void>;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatus: () => Promise<void>;
  onDeleteAnnotation: () => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setContent(''); setParentId(null); }, [thread?.annotation.id]);
  const left = Math.min(Math.max(12, position.x + 16), Math.max(12, window.innerWidth - 344));
  const top = Math.min(Math.max(12, position.y + 16), Math.max(12, window.innerHeight - 420));
  return <section className="wc-popover" style={{ left, top }} role="dialog" aria-label="Annotation comments">
    <header className="wc-header"><strong>{thread ? `Annotation · ${thread.annotation.status}` : 'New annotation'}</strong><button type="button" aria-label="Close comments" onClick={onClose}>×</button></header>
    {thread && <>
      <CommentThread comments={thread.comments} onReply={setParentId} onEdit={onEdit} onDelete={onDelete} />
      <div className="wc-row wc-actions"><button type="button" onClick={() => void onStatus()}>{thread.annotation.status === 'open' ? 'Resolve' : 'Reopen'}</button><button type="button" onClick={() => { if (confirm('Delete this annotation and all comments?')) void onDeleteAnnotation(); }}>Delete annotation</button></div>
    </>}
    <form onSubmit={async (event) => { event.preventDefault(); if (!content.trim()) return; setBusy(true); try { await onSubmit(content, parentId); setContent(''); setParentId(null); } catch { /* Parent displays the storage error; keep draft. */ } finally { setBusy(false); } }}>
      <label htmlFor="wc-comment-input">{parentId ? 'Reply' : 'Comment'}</label>
      {parentId && <button type="button" onClick={() => setParentId(null)}>Cancel reply</button>}
      <textarea id="wc-comment-input" autoFocus value={content} maxLength={5000} onChange={(event) => setContent(event.target.value)} placeholder="Write a comment…" />
      {error && <p className="wc-error" role="alert">{error}</p>}
      <button type="submit" className="wc-primary" disabled={busy || !content.trim()}>{busy ? 'Saving…' : thread ? 'Post comment' : 'Create annotation'}</button>
    </form>
  </section>;
}
