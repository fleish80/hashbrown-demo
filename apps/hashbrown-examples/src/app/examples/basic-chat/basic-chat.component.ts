/*
 * Basic chat: the smallest useful Hashbrown example.
 *
 * Follow one message through the app by its numbered steps:
 *   1. app.config.ts                 provideHashbrown() says where the server lives
 *   2. chat-composer.component.ts    the user types and submits
 *   3. this file, send()             the message enters the chat resource
 *   4. Hashbrown (library)           POSTs the whole conversation to /api/run
 *   5. apps/api run.controller.ts    the NestJS endpoint opens an event stream
 *   6. apps/api run.service.ts       the Gemini adapter calls the model
 *   7. back in the browser           events update chat.value() piece by piece
 *   8. basic-chat.component.html     the template re-renders the thread
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { chatResource, MagicText } from '@hashbrownai/angular';
import { AiStatusComponent } from '../../shared/ai-status/ai-status.component';
import { ChatComposerComponent } from '../../shared/chat-composer/chat-composer.component';
import { ExamplePageComponent } from '../../shared/example-page/example-page.component';
import { PromptChipsComponent } from '../../shared/prompt-chips/prompt-chips.component';
import { latchResourceValue } from '../../shared/latch-resource-value/latch-resource-value';
import { ScrollToBottomDirective } from '../../shared/scroll-to-bottom/scroll-to-bottom.directive';

@Component({
  selector: 'app-basic-chat',
  imports: [
    ExamplePageComponent,
    ChatComposerComponent,
    AiStatusComponent,
    PromptChipsComponent,
    ScrollToBottomDirective,
    // <hb-magic-text>: Hashbrown's markdown renderer, built to render text that is still streaming in.
    MagicText,
  ],
  templateUrl: './basic-chat.component.html',
  styleUrl: './basic-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicChatComponent {
  /*
   * chatResource() is the whole chat in one object. It follows Angular's Resource contract, so it
   * exposes signals:
   *   - value()         the conversation: user, assistant and error messages, oldest first
   *   - isLoading()     true from send until the reply is complete (sending, streaming or running tools)
   *   - isReceiving()   true only while reply text is streaming in
   *   - error()         the last failure, e.g. the server returned 503
   * and methods: sendMessage(), stop(), setMessages(), reload().
   *
   * It must be created in an injection context (a field initializer like this one), because it
   * injects the provideHashbrown() config and ties its lifetime to this component.
   *
   * There is no `model` option here on purpose: since Hashbrown 0.6 the server picks the model,
   * so a browser can't switch your app to a more expensive one.
   */
  protected readonly chat = chatResource({
    // Shows up as the name of this resource in the Redux DevTools browser extension.
    debugName: 'basic-chat',

    // The system prompt. Hashbrown sends it as the first message of every request.
    // It is a ReactiveOption, so you can also pass a signal and change it at runtime.
    system: `
      You are a senior Angular engineer helping a teammate, embedded in a demo app built with
      Angular 22. Answer like a code reviewer: direct, concrete, and specific to Angular.

      Prefer modern Angular and say so when it matters: standalone components, signals
      (signal, computed, effect, linkedSignal), signal inputs and outputs (input(), output(),
      model()), resource() and httpResource(), the @if / @for / @switch control flow, inject(),
      and zoneless change detection. Treat NgModules, @Input and @Output decorators, *ngIf and
      *ngFor, and constructor injection as legacy: show the modern equivalent when they come up.

      Show short, complete TypeScript or template snippets in fenced code blocks and name the
      Angular version a feature needs. Keep answers concise; use headings and lists only when
      they help. If a question is not about Angular or the web platform, say so in one line and
      steer back.
    `,
  });

  /*
   * Why not read chat.value() directly in the template? Angular resources throw from value() while
   * they are in the error state. The model being overloaded would then crash the template and
   * leave the view frozen. latchResourceValue() keeps showing the last good conversation instead,
   * and the template shows chat.error() separately.
   */
  protected readonly messages = latchResourceValue(this.chat, []);

  // One-click prompts for demos; each goes through the same send() as typed text.
  protected readonly prompts = [
    'How do signal inputs replace @Input?',
    'When should I use linkedSignal instead of computed?',
    'Convert *ngFor with trackBy to @for',
  ] as const;

  // Step 3: the composer emitted the text. sendMessage() appends it to value() immediately, so the
  // user bubble appears before the server has answered. Hashbrown then starts step 4 by itself:
  // it sends the system prompt plus the *entire* history, because the server keeps no state.
  protected send(text: string): void {
    this.chat.sendMessage({ role: 'user', content: text });
  }

  // Aborts the HTTP request. The server notices the closed connection and cancels the Gemini call.
  // The text streamed so far stays in the thread.
  protected stop(): void {
    this.chat.stop();
  }

  // Replaces the history. With an empty array, the next message starts a fresh conversation.
  protected clear(): void {
    this.chat.setMessages([]);
  }
}
