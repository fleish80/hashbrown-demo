import { ExampleDefinition } from './example.model';

export const EXAMPLES: readonly ExampleDefinition[] = [
  {
    slug: 'basic-chat',
    title: 'Basic chat',
    summary: 'Multi-turn streaming chat with chatResource',
    description:
      'The smallest useful Hashbrown app: a system prompt, a chat resource, streamed markdown replies rendered with hb-magic-text, and a stop button.',
    hashbrownApis: ['chatResource', 'hb-magic-text', 'provideHashbrown'],
    angularApis: ['signal forms', 'linkedSignal', 'afterRenderEffect', '@let'],
    loadComponent: () =>
      import('./basic-chat/basic-chat.component').then(
        (m) => m.BasicChatComponent,
      ),
  },
  {
    slug: 'structured-output',
    title: 'Structured output',
    summary: 'Typed, streaming JSON with structuredCompletionResource',
    description:
      'Ask for a weekend itinerary and get back a typed object that streams in field by field. The schema is defined once with Skillet and inferred as a TypeScript type.',
    hashbrownApis: ['structuredCompletionResource', 's.object', 's.streaming.array'],
    angularApis: ['signal forms', 'linkedSignal', 'computed'],
    loadComponent: () =>
      import('./structured-output/structured-output.component').then(
        (m) => m.StructuredOutputComponent,
      ),
  },
  {
    slug: 'tool-calling',
    title: 'Tool calling',
    summary: 'Let the model read and mutate app state with createTool',
    description:
      'A todo list lives in a signal store. The model gets four tools to list, add, complete and remove todos, and the UI updates live as tool calls run in the browser.',
    hashbrownApis: ['chatResource', 'createTool', 's.object'],
    angularApis: ['signal store service', 'computed', 'host bindings'],
    loadComponent: () =>
      import('./tool-calling/tool-calling.component').then(
        (m) => m.ToolCallingComponent,
      ),
  },
  {
    slug: 'generative-ui',
    title: 'Generative UI',
    summary: 'The model composes your Angular components with uiChatResource',
    description:
      'Expose a couple of trusted components to the model and let it lay out the answer with them. Only registered components can be rendered, and their inputs are validated against the schema.',
    hashbrownApis: ['uiChatResource', 'createUiKit', 'exposeComponent', 'hb-render-message', 'hb-magic-text', 'createTool'],
    angularApis: ['input.required', 'ng-content', 'computed'],
    loadComponent: () =>
      import('./generative-ui/generative-ui.component').then(
        (m) => m.GenerativeUiComponent,
      ),
  },
];
