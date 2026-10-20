import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTool, RenderMessageComponent, uiChatResource } from '@hashbrownai/angular';
import { AiStatusComponent } from '../../shared/ai-status/ai-status.component';
import { ChatComposerComponent } from '../../shared/chat-composer/chat-composer.component';
import { ExamplePageComponent } from '../../shared/example-page/example-page.component';
import { PromptChipsComponent } from '../../shared/prompt-chips/prompt-chips.component';
import { latchResourceValue } from '../../shared/latch-resource-value/latch-resource-value';
import { ScrollToBottomDirective } from '../../shared/scroll-to-bottom/scroll-to-bottom.directive';
import { dashboardUiKit } from './dashboard-ui-kit';
import { METRICS } from './metrics.data';

@Component({
  selector: 'app-generative-ui',
  imports: [
    ExamplePageComponent,
    ChatComposerComponent,
    AiStatusComponent,
    PromptChipsComponent,
    ScrollToBottomDirective,
    RenderMessageComponent,
  ],
  templateUrl: './generative-ui.component.html',
  styleUrl: './generative-ui.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerativeUiComponent {
  protected readonly chat = uiChatResource({
    debugName: 'generative-ui',
    system: `
      You are an analytics assistant. Call getMetrics to read the current
      numbers, then answer using the available components: one InfoCard per
      topic, a StatCard inside it for every metric that belongs there, and one
      Markdown note per card for short commentary. Never answer with an empty
      ui list, and never invent metrics that getMetrics did not return.
    `,
    components: [dashboardUiKit],
    tools: [
      createTool({
        name: 'getMetrics',
        description: 'Return the current product metrics with their change since last period',
        handler: async () => METRICS,
      }),
    ],
  });

  protected readonly messages = latchResourceValue(this.chat, []);

  protected readonly prompts = [
    'How are we doing this month?',
    'Show me growth vs. performance',
    'Which metric needs attention?',
  ] as const;

  protected send(text: string): void {
    this.chat.sendMessage({ role: 'user', content: text });
  }

  protected stop(): void {
    this.chat.stop();
  }
}
