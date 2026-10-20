import type { BaseEvent } from '@ag-ui/core';
import type { RunFingerprint } from './fixture-key.js';

/** One recorded run: the request it answers and the exact AG-UI events the model produced. */
export interface RunFixture {
  readonly version: 1;
  readonly recordedAt: string;
  readonly provider: string;
  readonly models: string;
  readonly fingerprint: RunFingerprint;
  readonly events: readonly BaseEvent[];
}
