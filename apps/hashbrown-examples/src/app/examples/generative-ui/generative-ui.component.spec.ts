import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { of } from 'rxjs';
import { EXAMPLES } from '../examples.registry';
import { GenerativeUiComponent } from './generative-ui.component';

describe('GenerativeUiComponent', () => {
  beforeEach(async () => {
    const data = { example: EXAMPLES[3] };
    await TestBed.configureTestingModule({
      imports: [GenerativeUiComponent],
      providers: [
        provideHashbrown({ baseUrl: '/api/run' }),
        { provide: ActivatedRoute, useValue: { data: of(data), snapshot: { data } } },
      ],
    }).compileComponents();
  });

  it('should create with an empty thread', async () => {
    const fixture = TestBed.createComponent(GenerativeUiComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.thread-empty')).toBeTruthy();
  });
});
