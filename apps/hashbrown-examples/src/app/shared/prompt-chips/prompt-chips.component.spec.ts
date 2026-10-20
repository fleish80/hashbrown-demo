import { TestBed } from '@angular/core/testing';
import { PromptChipsComponent } from './prompt-chips.component';

describe('PromptChipsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PromptChipsComponent] }).compileComponents();
  });

  it('should render one button per prompt and emit the clicked one', async () => {
    const fixture = TestBed.createComponent(PromptChipsComponent);
    fixture.componentRef.setInput('prompts', ['Say hi', "What's left?"]);
    await fixture.whenStable();
    const picked: string[] = [];
    fixture.componentInstance.pick.subscribe((prompt) => picked.push(prompt));

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.chip'));
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Say hi', "What's left?"]);
    buttons[1].click();
    expect(picked).toEqual(["What's left?"]);
  });

  it('should disable every chip while busy', async () => {
    const fixture = TestBed.createComponent(PromptChipsComponent);
    fixture.componentRef.setInput('prompts', ['Say hi']);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.chip');
    expect(button.disabled).toBe(true);
  });
});
