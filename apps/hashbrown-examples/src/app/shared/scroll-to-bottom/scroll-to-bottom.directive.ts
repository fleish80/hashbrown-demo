import { afterRenderEffect, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: '[appScrollToBottom]',
})
export class ScrollToBottomDirective {
  readonly trigger = input.required<unknown>({ alias: 'appScrollToBottom' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect({
      write: () => {
        this.trigger();
        const el = this.host.nativeElement;
        el.scrollTop = el.scrollHeight;
      },
    });
  }
}
