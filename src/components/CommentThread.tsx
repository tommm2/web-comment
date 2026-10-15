import { useState } from 'react';
import type { Comment } from '../types/domain';

export function CommentThread({ comments, onReply, onEdit, onDelete }: {
  comments: Comment[];
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  return <div className="wc-comments">
    {comments.map((comment) => <article key={comment.id} className="wc-comment" style={{ marginLeft: comment.parentId ? 16 : 0 }}>
      <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
      {editing === comment.id ? <form onSubmit={async (event) => { event.preventDefault(); try { await onEdit(comment.id, text); setEditing(null); } catch { /* Parent displays the storage error; keep draft. */ } }}>
        <textarea aria-label="Edit comment" value={text} maxLength={5000} onChange={(event) => setText(event.target.value)} />
        <div className="wc-row"><button type="submit">Save</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></div>
      </form> : <p>{comment.content}</p>}
      <div className="wc-row">
        <button type="button" onClick={() => onReply(comment.id)}>Reply</button>
        <button type="button" onClick={() => { setEditing(comment.id); setText(comment.content); }}>Edit</button>
        <button type="button" onClick={() => { if (confirm('Delete this comment and its replies?')) void onDelete(comment.id); }}>Delete</button>
      </div>
    </article>)}
  </div>;
}
