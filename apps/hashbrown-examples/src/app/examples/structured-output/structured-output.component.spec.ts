import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { of } from 'rxjs';
import { EXAMPLES } from '../examples.registry';
import { StructuredOutputComponent } from './structured-output.component';

describe('StructuredOutputComponent', () => {
  beforeEach(async () => {
    const data = { example: EXAMPLES[1] };
    await TestBed.configureTestingModule({
      imports: [StructuredOutputComponent],
      providers: [
        provideHashbrown({ baseUrl: '/api/run' }),
        { provide: ActivatedRoute, useValue: { data: of(data), snapshot: { data } } },
      ],
    }).compileComponents();
  });

  it('should stay dormant until a city is entered', async () => {
    const fixture = TestBed.createComponent(StructuredOutputComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.hint')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.plan')).toBeNull();
  });
});
