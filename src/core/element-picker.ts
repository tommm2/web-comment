export class ElementPicker {
  private frame = 0;
  private point = { x: 0, y: 0 };
  private active = false;

  constructor(
    private readonly onHover: (element: Element | null) => void,
    private readonly onSelect: (element: Element, point: { x: number; y: number }) => void,
  ) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    document.addEventListener('pointermove', this.move, true);
    document.addEventListener('click', this.click, true);
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    document.removeEventListener('pointermove', this.move, true);
    document.removeEventListener('click', this.click, true);
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    cancelAnimationFrame(this.frame);
    this.onHover(null);
  }

  private pick(x: number, y: number): Element | null {
    const element = document.elementFromPoint(x, y);
    if (!element || element.closest('[data-web-comment-ui]')) return null;
    return element;
  }

  private move = (event: PointerEvent): void => {
    this.point = { x: event.clientX, y: event.clientY };
    this.schedule();
  };

  private schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.active) this.onHover(this.pick(this.point.x, this.point.y));
    });
  };

  private click = (event: MouseEvent): void => {
    if (event.composedPath().some((target) => target instanceof Element && target.closest('[data-web-comment-ui]'))) return;
    const element = this.pick(event.clientX, event.clientY);
    if (!element) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.onSelect(element, { x: event.clientX, y: event.clientY });
  };
}
