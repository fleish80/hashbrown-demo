import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { chatResource, createTool, MagicText } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { AiStatusComponent } from '../../shared/ai-status/ai-status.component';
import { ChatComposerComponent } from '../../shared/chat-composer/chat-composer.component';
import { ExamplePageComponent } from '../../shared/example-page/example-page.component';
import { latchResourceValue } from '../../shared/latch-resource-value/latch-resource-value';
import { ScrollToBottomDirective } from '../../shared/scroll-to-bottom/scroll-to-bottom.directive';
import { TodoStore } from './todo.store';

@Component({
  selector: 'app-tool-calling',
  imports: [
    ExamplePageComponent,
    ChatComposerComponent,
    AiStatusComponent,
    ScrollToBottomDirective,
    JsonPipe,
    MagicText,
  ],
  providers: [TodoStore],
  templateUrl: './tool-calling.component.html',
  styleUrl: './tool-calling.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolCallingComponent {
  protected readonly todos = inject(TodoStore);

  protected readonly chat = chatResource({
    debugName: 'tool-calling',
    system: `
      You manage the user's todo list. Always call listTodos before answering
      questions about it, and use addTodo / completeTodo / removeTodo to change
      it. Confirm what you did in one short sentence.
    `,
    tools: [
      createTool({
        name: 'listTodos',
        description: 'Return every todo with its id, title and done flag',
        handler: async () => this.todos.todos(),
      }),
      createTool({
        name: 'addTodo',
        description: 'Add a new todo',
        schema: s.object('New todo', {
          title: s.string('Short title of the todo'),
        }),
        handler: async ({ title }) => this.todos.add(title),
      }),
      createTool({
        name: 'completeTodo',
        description: 'Mark a todo as done by id',
        schema: s.object('Todo to complete', {
          id: s.number('The id of the todo'),
        }),
        handler: async ({ id }) =>
          this.todos.complete(id) ?? { error: `No todo with id ${id}` },
      }),
      createTool({
        name: 'removeTodo',
        description: 'Delete a todo by id',
        schema: s.object('Todo to remove', {
          id: s.number('The id of the todo'),
        }),
        handler: async ({ id }) => ({ removed: this.todos.remove(id) }),
      }),
    ],
  });

  protected readonly messages = latchResourceValue(this.chat, []);

  protected send(text: string): void {
    this.chat.sendMessage({ role: 'user', content: text });
  }

  protected stop(): void {
    this.chat.stop();
  }
}
