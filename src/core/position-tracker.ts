export class PositionTracker {
  private frame = 0;
  private observer: MutationObserver | null = null;

  constructor(private readonly update: () => void) {}

  start(): void {
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
    this.observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !(mutation.target instanceof Element && mutation.target.closest('[data-web-comment-ui]')))) this.schedule();
    });
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    this.schedule();
  }

  stop(): void {
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    this.observer?.disconnect();
    this.observer = null;
    cancelAnimationFrame(this.frame);
  }

  private schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };
}
