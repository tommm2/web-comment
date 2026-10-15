import { afterEach, describe, expect, it, vi } from 'vitest';
import { observePageNavigation } from '../../src/core/page-navigation';

afterEach(() => { history.replaceState(null, '', '/'); vi.useRealTimers(); });

describe('page navigation', () => {
  it('observes SPA path changes and stops after cleanup', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = observePageNavigation(callback);
    history.pushState(null, '', '/next');
    vi.advanceTimersByTime(450);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
    history.pushState(null, '', '/last');
    vi.advanceTimersByTime(450);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('observes replaceState and back navigation', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = observePageNavigation(callback);
    history.pushState(null, '', '/first');
    vi.advanceTimersByTime(450);
    history.replaceState(null, '', '/second');
    vi.advanceTimersByTime(450);
    expect(callback.mock.calls.map(([url]) => url)).toEqual(['http://localhost:3000/first', 'http://localhost:3000/second']);
    stop();
  });
});
