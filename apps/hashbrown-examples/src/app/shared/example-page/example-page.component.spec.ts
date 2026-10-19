import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EXAMPLES } from '../../examples/examples.registry';
import { ExamplePageComponent } from './example-page.component';

describe('ExamplePageComponent', () => {
  it('should render the title from route data', async () => {
    const data = { example: EXAMPLES[0] };
    await TestBed.configureTestingModule({
      imports: [ExamplePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of(data), snapshot: { data } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ExamplePageComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.page-title').textContent).toContain(
      EXAMPLES[0].title,
    );
  });
});
