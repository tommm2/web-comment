import type { Anchor, Annotation, AnnotationStatus, Comment, Thread } from '../types/domain';
import { WebCommentDatabase } from './database';

function contentOf(input: string): string {
  const content = input.trim();
  if (!content) throw new Error('Comment cannot be empty');
  if (content.length > 5000) throw new Error('Comment is too long');
  return content;
}

export class AnnotationRepository {
  constructor(private readonly db: WebCommentDatabase) {}

  async listPage(pageUrl: string): Promise<Annotation[]> {
    return this.db.annotations.where('pageUrl').equals(pageUrl).toArray();
  }

  async getThread(id: string): Promise<Thread | null> {
    const annotation = await this.db.annotations.get(id);
    if (!annotation) return null;
    const comments = await this.db.comments.where('annotationId').equals(id).sortBy('createdAt');
    return { annotation, comments };
  }

  async createThread(anchor: Anchor, input: string): Promise<Thread> {
    const content = contentOf(input);
    const now = new Date().toISOString();
    const annotation: Annotation = { id: crypto.randomUUID(), pageUrl: anchor.pageUrl, anchor, status: 'open', createdAt: now, updatedAt: now };
    const comment: Comment = { id: crypto.randomUUID(), annotationId: annotation.id, parentId: null, content, createdAt: now, updatedAt: now };
    await this.db.transaction('rw', this.db.annotations, this.db.comments, async () => {
      await this.db.annotations.add(annotation);
      await this.db.comments.add(comment);
    });
    return { annotation, comments: [comment] };
  }

  async addComment(annotationId: string, parentId: string | null, input: string): Promise<Comment> {
    const content = contentOf(input);
    return this.db.transaction('rw', this.db.annotations, this.db.comments, async () => {
      const annotation = await this.db.annotations.get(annotationId);
      if (!annotation) throw new Error('Annotation not found');
      if (parentId) {
        const parent = await this.db.comments.get(parentId);
        if (!parent || parent.annotationId !== annotationId) throw new Error('Parent comment not found');
      }
      const now = new Date().toISOString();
      const comment: Comment = { id: crypto.randomUUID(), annotationId, parentId, content, createdAt: now, updatedAt: now };
      await this.db.comments.add(comment);
      await this.db.annotations.update(annotationId, { updatedAt: now });
      return comment;
    });
  }

  async editComment(id: string, input: string): Promise<void> {
    const content = contentOf(input);
    if (!await this.db.comments.update(id, { content, updatedAt: new Date().toISOString() })) throw new Error('Comment not found');
  }

  async deleteComment(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.comments, async () => {
      const root = await this.db.comments.get(id);
      if (!root) throw new Error('Comment not found');
      const comments = await this.db.comments.where('annotationId').equals(root.annotationId).toArray();
      const ids = new Set([id]);
      let previous = -1;
      while (ids.size !== previous) {
        previous = ids.size;
        for (const comment of comments) if (comment.parentId && ids.has(comment.parentId)) ids.add(comment.id);
      }
      await this.db.comments.bulkDelete([...ids]);
    });
  }

  async setStatus(id: string, status: AnnotationStatus): Promise<void> {
    if (status !== 'open' && status !== 'resolved') throw new Error('Invalid status');
    if (!await this.db.annotations.update(id, { status, updatedAt: new Date().toISOString() })) throw new Error('Annotation not found');
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.annotations, this.db.comments, async () => {
      await this.db.comments.where('annotationId').equals(id).delete();
      await this.db.annotations.delete(id);
    });
  }
}
