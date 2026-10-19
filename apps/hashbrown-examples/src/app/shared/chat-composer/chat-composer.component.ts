import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';

@Component({
  selector: 'app-chat-composer',
  imports: [FormField],
  templateUrl: './chat-composer.component.html',
  styleUrl: './chat-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposerComponent {
  readonly placeholder = input('Ask something…');
  readonly busy = input(false);
  readonly send = output<string>();
  readonly stop = output<void>();

  // Signal forms: the form model is a plain writable signal. [formField] in the template binds
  // the input to model().text in both directions.
  private readonly model = signal({ text: '' });

  protected readonly composer = form(this.model, (path) => {
    required(path.text, { message: 'Type a message first' });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) {
      return;
    }
    // Step 2: submit() marks the field touched and runs the validators. The callback only runs
    // when the form is valid, so an empty message never reaches the chat.
    await submit(this.composer, async (field) => {
      this.send.emit(field().value().text.trim());
      field().reset({ text: '' });
    });
  }
}
