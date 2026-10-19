import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { of } from 'rxjs';
import { EXAMPLES } from '../examples.registry';
import { ToolCallingComponent } from './tool-calling.component';

describe('ToolCallingComponent', () => {
  beforeEach(async () => {
    const data = { example: EXAMPLES[2] };
    await TestBed.configureTestingModule({
      imports: [ToolCallingComponent],
      providers: [
        provideHashbrown({ baseUrl: '/api/run' }),
        { provide: ActivatedRoute, useValue: { data: of(data), snapshot: { data } } },
      ],
    }).compileComponents();
  });

  it('should render the seeded todos', async () => {
    const fixture = TestBed.createComponent(ToolCallingComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.todo').length).toBe(3);
  });
});
