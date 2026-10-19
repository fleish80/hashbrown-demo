import { Route } from '@angular/router';
import { EXAMPLES } from './examples/examples.registry';
import { buildExampleRoutes } from './examples/examples.routes';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Hashbrown Examples',
    loadComponent: () =>
      import('./examples/home/home.component').then((m) => m.HomeComponent),
  },
  ...buildExampleRoutes(EXAMPLES),
  { path: '**', redirectTo: '' },
];
