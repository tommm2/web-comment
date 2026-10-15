import type { Anchor } from '../types/domain';

const STABLE_ATTRIBUTES = ['data-testid', 'data-test', 'aria-label', 'name', 'title'];

export function normalizedText(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function uniqueSelector(selector: string, element: Element): boolean {
  try {
    return document.querySelectorAll(selector).length === 1 && document.querySelector(selector) === element;
  } catch {
    return false;
  }
}

function selectorFor(element: Element): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) {
    const selector = /^[a-z][\w-]*$/i.test(element.id) ? `#${element.id}` : `[id=${JSON.stringify(element.id)}]`;
    if (uniqueSelector(selector, element)) return selector;
  }
  for (const attribute of STABLE_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (!value) continue;
    const selector = `${tag}[${attribute}=${JSON.stringify(value)}]`;
    if (uniqueSelector(selector, element)) return selector;
  }
  const classes = [...element.classList].filter((value) => /^[a-z][\w-]*$/i.test(value) && !/^(active|selected|hover|focus|css-|jsx-)/i.test(value));
  for (const value of classes.slice(0, 3)) {
    const selector = `${tag}.${value}`;
    if (uniqueSelector(selector, element)) return selector;
  }
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement && segments.length < 6) {
    const name: string = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    let segment = name;
    if (parent) {
      const siblings = [...parent.children].filter((child) => child.tagName === current?.tagName);
      if (siblings.length > 1) segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    segments.unshift(segment);
    const selector = segments.join(' > ');
    if (uniqueSelector(selector, element)) return selector;
    current = parent;
  }
  return segments.join(' > ');
}

function xpathFor(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current) {
    const name: string = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    const siblings = parent ? [...parent.children].filter((child) => child.tagName === current?.tagName) : [current];
    parts.unshift(`${name}[${siblings.indexOf(current) + 1}]`);
    current = parent;
  }
  return `/${parts.join('/')}`;
}

export function generateAnchor(element: Element, point: { x: number; y: number }, pageUrl: string): Anchor {
  const rect = element.getBoundingClientRect();
  const quote = normalizedText(element);
  const attributes = Object.fromEntries(STABLE_ATTRIBUTES.flatMap((name) => {
    const value = element.getAttribute(name);
    return value ? [[name, value]] : [];
  }));
  if (element.id) attributes.id = element.id;
  return {
    pageUrl,
    selector: selectorFor(element),
    xpath: xpathFor(element),
    quote,
    prefix: quote.slice(0, 32),
    suffix: quote.slice(-32),
    offset: {
      x: rect.width ? Math.min(1, Math.max(0, (point.x - rect.left) / rect.width)) : 0,
      y: rect.height ? Math.min(1, Math.max(0, (point.y - rect.top) / rect.height)) : 0,
    },
    tag: element.tagName.toLowerCase(),
    role: element.getAttribute('role') ?? '',
    name: element.getAttribute('aria-label') ?? '',
    attributes,
    classes: [...element.classList].slice(0, 6),
    ancestors: [...(function* () { let parent = element.parentElement; while (parent && parent !== document.documentElement) { yield parent.tagName.toLowerCase(); parent = parent.parentElement; } })()].slice(0, 4),
  };
}
