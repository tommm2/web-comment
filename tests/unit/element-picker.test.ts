import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElementPicker } from '../../src/core/element-picker';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('ElementPicker', () => {
  it('ignores extension UI and stops selecting after stop', () => {
    const page = document.createElement('button');
    const ui = document.createElement('div');
    ui.dataset.webCommentUi = '';
    document.body.append(page, ui);
    const selected = vi.fn();
    const hover = vi.fn();
    const picker = new ElementPicker(hover, selected);
    document.elementFromPoint = vi.fn().mockReturnValue(ui);
    picker.start();
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
    expect(selected).not.toHaveBeenCalled();
    document.elementFromPoint = vi.fn().mockReturnValue(page);
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
    expect(selected).toHaveBeenCalledWith(page, { x: 2, y: 2 });
    picker.stop();
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
    expect(selected).toHaveBeenCalledTimes(1);
  });
});
