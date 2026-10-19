import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTool, RenderMessageComponent, uiChatResource } from '@hashbrownai/angular';
import { AiStatusComponent } from '../../shared/ai-status/ai-status.component';
import { ChatComposerComponent } from '../../shared/chat-composer/chat-composer.component';
import { ExamplePageComponent } from '../../shared/example-page/example-page.component';
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
      numbers, then answer using the available components: group related
      StatCards inside an InfoCard, and use Markdown for short commentary.
      Never invent metrics that getMetrics did not return.
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

  protected send(text: string): void {
    this.chat.sendMessage({ role: 'user', content: text });
  }

  protected stop(): void {
    this.chat.stop();
  }
}
