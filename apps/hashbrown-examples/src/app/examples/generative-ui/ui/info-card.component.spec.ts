import { TestBed } from '@angular/core/testing';
import { InfoCardComponent } from './info-card.component';

describe('InfoCardComponent', () => {
  it('should render its title', async () => {
    await TestBed.configureTestingModule({ imports: [InfoCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(InfoCardComponent);
    fixture.componentRef.setInput('title', 'Overview');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.info-title').textContent).toContain('Overview');
  });
});
