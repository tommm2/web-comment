import type { Anchor } from '../types/domain';
import { normalizedText } from './anchor-generator';

function score(candidate: Element, anchor: Anchor): number {
  if (candidate.tagName.toLowerCase() !== anchor.tag) return -1;
  const text = normalizedText(candidate);
  if (anchor.quote && text !== anchor.quote) return -1;
  for (const [name, value] of Object.entries(anchor.attributes)) {
    if (candidate.getAttribute(name) !== value) return -1;
  }
  if (anchor.role && candidate.getAttribute('role') !== anchor.role) return -1;
  if (anchor.name && candidate.getAttribute('aria-label') !== anchor.name) return -1;
  const matchingClasses = anchor.classes.filter((value) => candidate.classList.contains(value)).length;
  if (!anchor.quote && !Object.keys(anchor.attributes).length && !anchor.name && anchor.classes.length && !matchingClasses) return -1;
  let result = 4;
  if (anchor.quote) result += 4;
  result += Object.keys(anchor.attributes).length * 3;
  result += matchingClasses;
  let parent = candidate.parentElement;
  for (const tag of anchor.ancestors) {
    if (parent?.tagName.toLowerCase() === tag) result += 1;
    parent = parent?.parentElement ?? null;
  }
  return result;
}

export function resolveAnchor(anchor: Anchor, root: Document = document): Element | null {
  if (!anchor.quote && !Object.keys(anchor.attributes).length && !anchor.name && !anchor.classes.length) return null;
  const candidates = new Set<Element>();
  try { root.querySelectorAll(anchor.selector).forEach((element) => candidates.add(element)); } catch { /* stale selector */ }
  try {
    const xpath = root.evaluate(anchor.xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (xpath instanceof Element) candidates.add(xpath);
  } catch { /* stale xpath */ }
  // Bounded fallback; candidates must still match every strong feature.
  root.querySelectorAll(anchor.tag).forEach((element, index) => { if (index < 500) candidates.add(element); });
  const ranked = [...candidates].map((element) => ({ element, value: score(element, anchor) })).filter(({ value }) => value >= 4).sort((a, b) => b.value - a.value);
  if (!ranked[0] || (ranked[1] && ranked[0].value - ranked[1].value < 2)) return null;
  return ranked[0].element;
}
