# Hashbrown Examples

An Nx workspace showing how to use [Hashbrown](https://hashbrown.dev) (generative UI for Angular) with the latest Angular features. Every example is a lazy-loaded route registered in a single place, so adding a new one is a folder plus one registry entry.

Repository: [github.com/fleish80/hashbrown-demo](https://github.com/fleish80/hashbrown-demo)

## Projects

| Project | What it is | Serve |
| --- | --- | --- |
| `apps/hashbrown-examples` | Angular 22 app (zoneless, standalone, signal forms). One route per example. | `npx nx serve hashbrown-examples` |
| `apps/api` | NestJS 12 app (ESM, Express 5) exposing `POST /api/run`, the AG-UI endpoint Hashbrown clients talk to. Uses Gemini by default; Claude and OpenAI are optional. | `npx nx serve api` |

Serving the Angular app automatically starts the API on port 3333 (`serve` depends on `api:serve`) and proxies `/api/*` to it.

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env   # then set GEMINI_API_KEY, or see "Using Claude" below
npm start              # http://localhost:4300
```

## Examples

| Route | Hashbrown APIs | Shows |
| --- | --- | --- |
| `/basic-chat` | `chatResource`, `hb-magic-text` | An Angular expert agent: a system prompt plus streaming multi-turn chat with markdown and a stop button |
| `/structured-output` | `structuredCompletionResource`, `s.streaming.*` | Typed JSON that streams in field by field, edited locally with `linkedSignal` |
| `/tool-calling` | `chatResource`, `createTool` | The model reads and mutates a signal store through browser-side tools |
| `/generative-ui` | `uiChatResource`, `createUiKit`, `exposeComponent`, `hb-render-message` | The model lays out the answer with your own Angular components |

## API

`apps/api` is a NestJS 12 app. NestJS 12 ships as ESM, so the app has its own `package.json` with `"type": "module"` and compiles with `module: nodenext`.

- `src/run/run.controller.ts` streams `POST /api/run` as server-sent events. It aborts the OpenAI call when the client disconnects.
- `src/run/run.service.ts` calls the Hashbrown Google adapter (or the OpenAI one when `LLM_PROVIDER=openai`) and throws a 503 when no key is configured.
- `src/run/model-fallback.ts` retries a run on the next model in `GEMINI_MODEL` when Google reports the model overloaded, or when it sends nothing for `MODEL_FIRST_EVENT_TIMEOUT_MS` (default 20 seconds), before any output streams. The default chain ends with the Gemini 3.5 and 3.1 Flash Lite models, which answer when the full Flash models report high demand. Keep the list to Gemini 3 models: 2.5 models reject tool calls combined with JSON output, which generative UI needs.
- `src/replay/` is a fourth provider, `LLM_PROVIDER=replay`, that streams recorded runs from `apps/api/fixtures` instead of calling a model. See "Presenting" below.
- `src/health/health.controller.ts` serves `GET /api/health`.
- Configuration comes from `@nestjs/config`, which reads `apps/api/.env`.

Nest's dependency injection needs decorator metadata, which esbuild cannot emit. So `nx build api` uses `tsc`, `nx serve api` runs the TypeScript directly through `@swc-node/register` in Node watch mode, and Vitest uses `unplugin-swc`.

## Using Claude

Set `LLM_PROVIDER=anthropic` in `apps/api/.env`. The default model is Claude Opus 5.5 (`claude-opus-5-5`); change it with `CLAUDE_MODEL`. There are two ways to sign in:

- **API key:** set `ANTHROPIC_API_KEY` to a key from the Claude Console.
- **No key in a file:** leave `ANTHROPIC_API_KEY` unset and sign in once with Anthropic's `ant` CLI. The Anthropic SDK then finds the stored profile on its own.

```bash
brew install anthropics/tap/ant
ant auth login
ant auth status
```

To keep this app's sign-in separate from Claude Code's, use a named profile and point the API at it with `ANTHROPIC_PROFILE` in `apps/api/.env`:

```bash
ant --profile personal auth login
```

`GET /api/health` reports `"credentials": "sdk-default"` when the API is relying on the profile. Requests through either route are billed to the Console organization you sign in to. The adapter's 4,096-token reply cap is raised to 64,000 in `run.service.ts`, because Claude's thinking counts toward that cap.

## Presenting

Three things make the app demo-friendly.

**Prompt chips.** Every example has ready-made prompts above the composer, so nothing has to be typed on stage. They go through the same `send()` as typed text. Each example declares its own list in its component.

**AG-UI inspector.** The "AG-UI events" button in the sidebar opens a panel that lists every run the app has made: the request summary (message count, tools, whether a response schema and UI were requested, the full body) and every event the server streamed back, with timings. "Collapse deltas" folds streaming chunks of one message into one row. It is fed by a wrapper around Hashbrown's HTTP transport in `src/app/shared/ag-ui-inspector/`, so it sees exactly what Hashbrown sees. A tool-calling turn shows up as two runs: the one that ends in a tool call, and the one that sends the tool result back.

**Replay provider.** Model APIs stall and return 503 at the worst moment. With `LLM_PROVIDER=replay` the API never calls a model: it matches each request to a recorded run in `apps/api/fixtures` and streams those events back, paced by `REPLAY_DELAY_MS`. Browser-side tools still run for real, so the todo list still changes. Fixtures for every prompt chip are committed. A prompt with no recording ends the run with a `RUN_ERROR` that says so.

To record new fixtures, run with a real provider and `RECORD_FIXTURES=true`, then click through the prompts; every finished run is written to `FIXTURES_DIR` (default `fixtures`). Runs are matched on the last user message, the tool results sent back after it, and whether a schema or UI was requested, so the system prompt and ids do not matter. Nx reads `apps/api/.env` once per `serve`, so restart `npm start` after changing `LLM_PROVIDER` or `RECORD_FIXTURES`.

## Reading the code

Start with the basic chat example. Its files carry numbered comments, steps 1 to 8, that follow one message from the input box to Gemini and back. The list of steps is at the top of `apps/hashbrown-examples/src/app/examples/basic-chat/basic-chat.component.ts`.

## Adding an example

1. Create `apps/hashbrown-examples/src/app/examples/<slug>/` with the four component files (`.ts`, `.html`, `.scss`, `.spec.ts`). Wrap the template in `<app-example-page>` so the header (title, description, API chips) renders from route data.
2. Add one entry to `EXAMPLES` in `apps/hashbrown-examples/src/app/examples/examples.registry.ts` with the slug, copy, API lists and a `loadComponent` import.

That is it: `app.routes.ts` builds the routes from the registry, and the sidebar and home page iterate over it.

Shared building blocks live in `src/app/shared/`:

- `app-chat-composer`: signal-forms input with Send/Stop, emits the trimmed text.
- `app-ai-status`: busy pulse or error line, driven by the resource's `isLoading()` and error signals.
- `appScrollToBottom`: `afterRenderEffect` directive that keeps a thread scrolled to the newest message.

## Angular features in use

Zoneless change detection, standalone components, `input()`/`output()`/`computed()`/`linkedSignal()`, signal forms (`form()`, `FormField`, `required()`, `submit()`), `afterRenderEffect`, `@let`, native control flow, `host` bindings, `withComponentInputBinding()` and `withViewTransitions()` on the router, Vitest through `@angular/build:unit-test`.

## Commands

```bash
npm run build   # nx run-many -t build
npm run test    # nx run-many -t test
npm run lint    # nx run-many -t lint
npm run check   # build + lint + test
```
