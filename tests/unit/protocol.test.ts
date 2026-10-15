import { describe, expect, it } from 'vitest';
import { isRequest } from '../../src/messaging/protocol';

describe('message boundary', () => {
  it('rejects malformed commands', () => {
    expect(isRequest({ channel: 'web-comment', type: 'createThread', anchor: {}, content: '' })).toBe(false);
    expect(isRequest({ channel: 'other', type: 'listPage', pageUrl: 'https://example.com' })).toBe(false);
  });
  it('accepts a valid page query', () => {
    expect(isRequest({ channel: 'web-comment', type: 'listPage', pageUrl: 'https://example.com/a' })).toBe(true);
  });
  it('rejects a non-finite anchor offset', () => {
    expect(isRequest({ channel: 'web-comment', type: 'createThread', content: 'Hi', anchor: { pageUrl: 'https://example.com', selector: '#a', xpath: '/html', tag: 'div', offset: { x: Number.NaN, y: 0 } } })).toBe(false);
  });
});
