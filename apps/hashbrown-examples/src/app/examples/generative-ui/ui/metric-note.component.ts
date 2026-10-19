import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MagicText } from '@hashbrownai/angular';

// Exposed to the model as `Markdown` instead of Hashbrown's exposeMarkdown(), so the note is a
// direct child of the card and can claim a full line below the stat tiles.
@Component({
  selector: 'app-metric-note',
  imports: [MagicText],
  templateUrl: './metric-note.component.html',
  styleUrl: './metric-note.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricNoteComponent {
  readonly children = input('');
}
