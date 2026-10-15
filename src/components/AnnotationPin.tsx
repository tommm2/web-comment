import type { Annotation } from '../types/domain';

export function AnnotationPin({ annotation, number, onClick }: { annotation: Annotation; number: number; onClick: () => void }) {
  return <button type="button" data-pin-id={annotation.id} className="wc-pin" aria-label={`Open annotation ${number}`} title={`Annotation ${number}: ${annotation.status}`} onClick={onClick}>{number}</button>;
}
