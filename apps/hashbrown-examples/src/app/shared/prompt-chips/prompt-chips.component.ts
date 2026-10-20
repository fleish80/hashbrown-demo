import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Ready-made prompts shown as buttons, so a demo never depends on typing. */
@Component({
  selector: 'app-prompt-chips',
  templateUrl: './prompt-chips.component.html',
  styleUrl: './prompt-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptChipsComponent {
  readonly prompts = input.required<readonly string[]>();
  readonly disabled = input(false);
  readonly pick = output<string>();
}
