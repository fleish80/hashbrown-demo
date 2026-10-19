import { TestBed } from '@angular/core/testing';
import { ChatComposerComponent } from './chat-composer.component';

describe('ChatComposerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComposerComponent],
    }).compileComponents();
  });

  it('should disable send while the input is empty', async () => {
    const fixture = TestBed.createComponent(ChatComposerComponent);
    await fixture.whenStable();
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('.composer-button');
    expect(button.disabled).toBe(true);
  });

  it('should emit the trimmed text on submit and clear the field', async () => {
    const fixture = TestBed.createComponent(ChatComposerComponent);
    await fixture.whenStable();
    const sent: string[] = [];
    fixture.componentInstance.send.subscribe((text) => sent.push(text));

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('.composer-input');
    input.value = '  hello  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    fixture.nativeElement
      .querySelector('.composer')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(sent).toEqual(['hello']);
    expect(input.value).toBe('');
  });
});
