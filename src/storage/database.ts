import Dexie, { type Table } from 'dexie';
import type { Annotation, Comment } from '../types/domain';

export class WebCommentDatabase extends Dexie {
  annotations!: Table<Annotation, string>;
  comments!: Table<Comment, string>;

  constructor(name = 'web-comment') {
    super(name);
    this.version(1).stores({
      annotations: 'id, pageUrl, status, createdAt, updatedAt',
      comments: 'id, annotationId, parentId, createdAt, updatedAt',
    });
  }
}
