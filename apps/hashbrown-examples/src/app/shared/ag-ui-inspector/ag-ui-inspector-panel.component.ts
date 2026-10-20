import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { agUiInspector } from './ag-ui-inspector';
import { toRows } from './event-rows';

/** Lists every AG-UI run and event the app has exchanged with the server, newest run first. */
@Component({
  selector: 'app-ag-ui-inspector-panel',
  imports: [JsonPipe],
  templateUrl: './ag-ui-inspector-panel.component.html',
  styleUrl: './ag-ui-inspector-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgUiInspectorPanelComponent {
  protected readonly inspector = agUiInspector;

  protected readonly runs = computed(() =>
    this.inspector.runs().map((run) => ({
      ...run,
      rows: toRows(run.events, this.inspector.collapseDeltas()),
    })),
  );

  protected onCollapseChange(event: Event): void {
    this.inspector.setCollapseDeltas((event.target as HTMLInputElement).checked);
  }
}
