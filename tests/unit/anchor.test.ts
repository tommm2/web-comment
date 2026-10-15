import { beforeEach, describe, expect, it } from 'vitest';
import { generateAnchor } from '../../src/core/anchor-generator';
import { resolveAnchor } from '../../src/core/anchor-resolver';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('anchors', () => {
  it('uses a stable attribute and restores the same element', () => {
    document.body.innerHTML = '<button data-testid="save">Save draft</button>';
    const element = document.querySelector('button')!;
    const anchor = generateAnchor(element, { x: 10, y: 10 }, 'https://example.com/doc');
    expect(anchor.selector).toBe('button[data-testid="save"]');
    expect(anchor.xpath).toBeTruthy();
    expect(resolveAnchor(anchor)).toBe(element);
  });

  it('refuses an ambiguous replacement', () => {
    document.body.innerHTML = '<button>Save</button>';
    const anchor = generateAnchor(document.querySelector('button')!, { x: 0, y: 0 }, 'https://example.com');
    document.body.innerHTML = '<button>Save</button><button>Save</button>';
    expect(resolveAnchor(anchor)).toBeNull();
  });

  it('marks a changed element as orphan instead of binding to unrelated content', () => {
    document.body.innerHTML = '<button id="save">Save draft</button>';
    const anchor = generateAnchor(document.querySelector('button')!, { x: 0, y: 0 }, 'https://example.com');
    document.body.innerHTML = '<button id="save">Delete account</button>';
    expect(resolveAnchor(anchor)).toBeNull();
  });

  it('does not bind an unidentifiable empty element to a replacement', () => {
    document.body.innerHTML = '<div></div>';
    const anchor = generateAnchor(document.querySelector('div')!, { x: 0, y: 0 }, 'https://example.com');
    document.body.innerHTML = '<div></div>';
    expect(resolveAnchor(anchor)).toBeNull();
  });
  it('does not bind a different image after its class and source change', () => {
    document.body.innerHTML = '<img class="hero" src="a.jpg">';
    const anchor = generateAnchor(document.querySelector('img')!, { x: 0, y: 0 }, 'https://example.com');
    document.body.innerHTML = '<img src="unrelated.jpg">';
    expect(resolveAnchor(anchor)).toBeNull();
  });
});
