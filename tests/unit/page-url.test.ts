import { describe, expect, it } from 'vitest';
import { normalizePageUrl } from '../../src/utils/page-url';

describe('normalizePageUrl', () => {
  it('sorts query parameters and removes fragment', () => {
    expect(normalizePageUrl('https://Example.com/a?z=2&a=1#part')).toBe('https://example.com/a?a=1&z=2');
  });
  it('can exclude query parameters', () => {
    expect(normalizePageUrl('https://example.com/a?q=1#part', false)).toBe('https://example.com/a');
  });
  it('rejects browser internal pages', () => {
    expect(() => normalizePageUrl('chrome://settings')).toThrow('Unsupported page URL');
  });
});
