import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EXAMPLES } from './examples/examples.registry';
import { agUiInspector } from './shared/ag-ui-inspector/ag-ui-inspector';
import { AgUiInspectorPanelComponent } from './shared/ag-ui-inspector/ag-ui-inspector-panel.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AgUiInspectorPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly examples = EXAMPLES;
  protected readonly inspector = agUiInspector;
}
