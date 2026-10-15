import type { Anchor, Annotation, AnnotationStatus, Comment, Thread } from '../types/domain';

type Base = { channel: 'web-comment' };
export type Request = Base & (
  | { type: 'listPage'; pageUrl: string }
  | { type: 'getThread'; id: string }
  | { type: 'createThread'; anchor: Anchor; content: string }
  | { type: 'addComment'; annotationId: string; parentId: string | null; content: string }
  | { type: 'editComment'; id: string; content: string }
  | { type: 'deleteComment'; id: string }
  | { type: 'setStatus'; id: string; status: AnnotationStatus }
  | { type: 'deleteAnnotation'; id: string }
  | { type: 'grantSite'; origin: string }
);

export interface ResultMap {
  listPage: Annotation[];
  getThread: Thread | null;
  createThread: Thread;
  addComment: Comment;
  editComment: null;
  deleteComment: null;
  setStatus: null;
  deleteAnnotation: null;
  grantSite: boolean;
}

export type Response<T> = { ok: true; data: T } | { ok: false; error: string };

function isAnchor(input: unknown): input is Anchor {
  if (!input || typeof input !== 'object') return false;
  const anchor = input as Record<string, unknown>;
  const offset = anchor.offset as Record<string, unknown> | undefined;
  const attributes = anchor.attributes;
  return ['pageUrl', 'selector', 'xpath', 'quote', 'prefix', 'suffix', 'tag', 'role', 'name'].every((key) => typeof anchor[key] === 'string')
    && !!offset && typeof offset.x === 'number' && Number.isFinite(offset.x) && offset.x >= 0 && offset.x <= 1
    && typeof offset.y === 'number' && Number.isFinite(offset.y) && offset.y >= 0 && offset.y <= 1
    && !!attributes && typeof attributes === 'object' && !Array.isArray(attributes) && Object.values(attributes).every((value) => typeof value === 'string')
    && Array.isArray(anchor.classes) && anchor.classes.every((value: unknown) => typeof value === 'string')
    && Array.isArray(anchor.ancestors) && anchor.ancestors.every((value: unknown) => typeof value === 'string');
}

export function isRequest(input: unknown): input is Request {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  if (value.channel !== 'web-comment' || typeof value.type !== 'string') return false;
  const str = (key: string) => typeof value[key] === 'string';
  switch (value.type) {
    case 'listPage': return str('pageUrl');
    case 'getThread': case 'deleteComment': case 'deleteAnnotation': return str('id');
    case 'createThread': {
      return str('content') && isAnchor(value.anchor);
    }
    case 'addComment': return str('annotationId') && str('content') && (value.parentId === null || str('parentId'));
    case 'editComment': return str('id') && str('content');
    case 'setStatus': return str('id') && (value.status === 'open' || value.status === 'resolved');
    case 'grantSite': return str('origin');
    default: return false;
  }
}
