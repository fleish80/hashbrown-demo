import { TestBed } from '@angular/core/testing';
import type { AGUIEvent } from '@ag-ui/core';
import { agUiInspector, inspectTransport } from './ag-ui-inspector';
import { AgUiInspectorPanelComponent } from './ag-ui-inspector-panel.component';

async function recordRun(): Promise<void> {
  const transport = inspectTransport({
    name: 'Fake',
    async send() {
      return {
        events: (async function* () {
          yield { type: 'RUN_STARTED', threadId: 't', runId: 'r' } as AGUIEvent;
          yield { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'Hel' } as AGUIEvent;
          yield { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'lo' } as AGUIEvent;
          yield { type: 'RUN_FINISHED', threadId: 't', runId: 'r' } as AGUIEvent;
        })(),
      };
    },
  });
  const response = await transport.send({
    requestId: 'req',
    attempt: 1,
    maxAttempts: 1,
    signal: new AbortController().signal,
    input: { threadId: 't', runId: 'r', state: {}, context: [], forwardedProps: {}, tools: [], messages: [{ id: 'u', role: 'user', content: 'Say hi' }] },
  });
  for await (const _ of response.events) {
    void _;
  }
}

describe('AgUiInspectorPanelComponent', () => {
  beforeEach(async () => {
    agUiInspector.clear();
    agUiInspector.setCollapseDeltas(true);
    await TestBed.configureTestingModule({ imports: [AgUiInspectorPanelComponent] }).compileComponents();
  });

  it('should show the empty hint before any run', async () => {
    const fixture = TestBed.createComponent(AgUiInspectorPanelComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.inspector-empty')).toBeTruthy();
  });

  it('should list a recorded run with folded deltas', async () => {
    await recordRun();
    const fixture = TestBed.createComponent(AgUiInspectorPanelComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.run-prompt').textContent).toContain('Say hi');
    const types = Array.from(fixture.nativeElement.querySelectorAll('.event-type')).map((el) => (el as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());
    expect(types).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_CONTENT ×2', 'RUN_FINISHED']);
  });

  it('should show every delta when folding is switched off', async () => {
    await recordRun();
    const fixture = TestBed.createComponent(AgUiInspectorPanelComponent);
    await fixture.whenStable();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.inspector-option input');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.event').length).toBe(4);
  });
});
