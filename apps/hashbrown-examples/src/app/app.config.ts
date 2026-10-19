import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withViewTransitions({
        onViewTransitionCreated: ({ transition }) => {
          // A transition started while the tab is hidden rejects `ready`; that is expected, not an error.
          transition.ready.catch(() => undefined);
        },
      }),
    ),
    // Step 1: every Hashbrown resource in the app POSTs to this URL. It is relative, so in dev the
    // Angular dev server forwards it to the NestJS API on port 3333 (see proxy.conf.json).
    // The browser never sees an API key: the key stays on the server.
    provideHashbrown({ baseUrl: '/api/run' }),
  ],
};
