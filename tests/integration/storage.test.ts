import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { WebCommentDatabase } from '../../src/storage/database';
import { AnnotationRepository } from '../../src/storage/repository';
import type { Anchor } from '../../src/types/domain';

const anchor: Anchor = { pageUrl: 'https://example.com/a', selector: '#a', xpath: '/html[1]/body[1]/p[1]', quote: 'A', prefix: 'A', suffix: 'A', offset: { x: 0, y: 0 }, tag: 'p', role: '', name: '', attributes: {}, classes: [], ancestors: ['body'] };
const opened: WebCommentDatabase[] = [];

function repository() {
  const db = new WebCommentDatabase(`test-${crypto.randomUUID()}`);
  opened.push(db);
  return new AnnotationRepository(db);
}

afterEach(async () => { for (const db of opened.splice(0)) await db.delete(); });

describe('storage', () => {
  it('creates a thread and only lists its page', async () => {
    const repo = repository();
    const thread = await repo.createThread(anchor, 'First');
    expect(thread.comments[0]?.content).toBe('First');
    expect((await repo.listPage('https://example.com/a')).length).toBe(1);
    expect(await repo.listPage('https://example.com/b')).toEqual([]);
  });
  it('deletes a parent and descendants', async () => {
    const repo = repository();
    const thread = await repo.createThread(anchor, 'First');
    const parent = await repo.addComment(thread.annotation.id, null, 'Reply');
    await repo.addComment(thread.annotation.id, parent.id, 'Child');
    await repo.deleteComment(parent.id);
    expect((await repo.getThread(thread.annotation.id))?.comments.map((comment) => comment.content)).toEqual(['First']);
  });
  it('deletes an annotation and its comments atomically', async () => {
    const repo = repository();
    const thread = await repo.createThread(anchor, 'First');
    await repo.deleteAnnotation(thread.annotation.id);
    expect(await repo.getThread(thread.annotation.id)).toBeNull();
  });
  it('rejects whitespace-only content', async () => {
    const repo = repository();
    await expect(repo.createThread(anchor, '   ')).rejects.toThrow('Comment cannot be empty');
  });
  it('edits a comment and changes annotation status', async () => {
    const repo = repository();
    const thread = await repo.createThread(anchor, 'First');
    expect(thread.annotation.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(thread.comments[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    await repo.editComment(thread.comments[0]!.id, 'Updated');
    await repo.setStatus(thread.annotation.id, 'resolved');
    const updated = await repo.getThread(thread.annotation.id);
    expect(updated?.comments[0]?.content).toBe('Updated');
    expect(updated?.annotation.status).toBe('resolved');
  });
});
