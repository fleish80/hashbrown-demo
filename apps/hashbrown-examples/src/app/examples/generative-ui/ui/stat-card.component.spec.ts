import { TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  it('should render label, value and trend arrow', async () => {
    await TestBed.configureTestingModule({ imports: [StatCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Users');
    fixture.componentRef.setInput('value', '1,204');
    fixture.componentRef.setInput('trend', 'up');
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-value')?.textContent).toContain('1,204');
    expect(el.classList.contains('stat-up')).toBe(true);
  });
});
