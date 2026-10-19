import { Route } from '@angular/router';
import { ExampleDefinition } from './example.model';

export const EXAMPLE_ROUTE_DATA_KEY = 'example';

export function buildExampleRoutes(
  examples: readonly ExampleDefinition[],
): Route[] {
  return examples.map((example) => ({
    path: example.slug,
    title: `${example.title} · Hashbrown Examples`,
    data: { [EXAMPLE_ROUTE_DATA_KEY]: example },
    loadComponent: example.loadComponent,
  }));
}
