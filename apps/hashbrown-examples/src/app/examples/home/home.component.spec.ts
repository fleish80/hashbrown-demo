import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EXAMPLES } from '../examples.registry';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render a card per registered example', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    const cards = fixture.nativeElement.querySelectorAll('.card');
    expect(cards.length).toBe(EXAMPLES.length);
  });
});
