import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ExampleDefinition } from '../../examples/example.model';
import { EXAMPLE_ROUTE_DATA_KEY } from '../../examples/examples.routes';

@Component({
  selector: 'app-example-page',
  templateUrl: './example-page.component.html',
  styleUrl: './example-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamplePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly example = computed(
    () => this.routeData()[EXAMPLE_ROUTE_DATA_KEY] as ExampleDefinition | undefined,
  );
}
