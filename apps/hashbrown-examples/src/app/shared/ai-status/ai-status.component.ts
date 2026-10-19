import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ai-status',
  templateUrl: './ai-status.component.html',
  styleUrl: './ai-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.status-hidden]': '!busy() && !error()',
  },
})
export class AiStatusComponent {
  readonly busy = input(false);
  readonly busyLabel = input('Thinking…');
  readonly error = input<Error | undefined>(undefined);
}
