import { TestBed } from '@angular/core/testing';
import { AiStatusComponent } from './ai-status.component';

describe('AiStatusComponent', () => {
  it('should show the error over the busy indicator', async () => {
    await TestBed.configureTestingModule({
      imports: [AiStatusComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(AiStatusComponent);
    fixture.componentRef.setInput('busy', true);
    fixture.componentRef.setInput('error', new Error('boom'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.status-error').textContent).toContain('boom');
    expect(fixture.nativeElement.querySelector('.status-busy')).toBeNull();
  });
});
