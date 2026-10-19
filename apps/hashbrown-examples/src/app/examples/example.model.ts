import { Type } from '@angular/core';

export interface ExampleDefinition {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly hashbrownApis: readonly string[];
  readonly angularApis: readonly string[];
  readonly loadComponent: () => Promise<Type<unknown>>;
}
