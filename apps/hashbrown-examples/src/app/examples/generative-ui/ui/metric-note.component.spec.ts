import { TestBed } from '@angular/core/testing';
import { MetricNoteComponent } from './metric-note.component';

describe('MetricNoteComponent', () => {
  async function render(children: string): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [MetricNoteComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MetricNoteComponent);
    fixture.componentRef.setInput('children', children);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('should render the markdown', async () => {
    const el = await render('Revenue grew **4.8%**');
    expect(el.textContent).toContain('Revenue grew');
    expect(el.querySelector('strong')?.textContent).toBe('4.8%');
  });

  it('should render nothing before the first chunk', async () => {
    const el = await render('');
    expect(el.textContent?.trim()).toBe('');
  });
});
