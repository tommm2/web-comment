export type AnnotationStatus = 'open' | 'resolved';

export interface Anchor {
  pageUrl: string;
  selector: string;
  xpath: string;
  quote: string;
  prefix: string;
  suffix: string;
  offset: { x: number; y: number };
  tag: string;
  role: string;
  name: string;
  attributes: Record<string, string>;
  classes: string[];
  ancestors: string[];
}

export interface Annotation {
  id: string;
  pageUrl: string;
  anchor: Anchor;
  status: AnnotationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  annotationId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  annotation: Annotation;
  comments: Comment[];
}
