import { ChangeDetectionStrategy, Component, linkedSignal, signal } from '@angular/core';
import { structuredCompletionResource } from '@hashbrownai/angular';
import { AiStatusComponent } from '../../shared/ai-status/ai-status.component';
import { ChatComposerComponent } from '../../shared/chat-composer/chat-composer.component';
import { JsonPipe } from '@angular/common';
import { ExamplePageComponent } from '../../shared/example-page/example-page.component';
import { PromptChipsComponent } from '../../shared/prompt-chips/prompt-chips.component';
import { latchResourceValue } from '../../shared/latch-resource-value/latch-resource-value';
import { type Itinerary, ItinerarySchema } from './itinerary.schema';

@Component({
  selector: 'app-structured-output',
  imports: [JsonPipe, ExamplePageComponent, ChatComposerComponent, AiStatusComponent, PromptChipsComponent],
  templateUrl: './structured-output.component.html',
  styleUrl: './structured-output.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructuredOutputComponent {
  protected readonly city = signal<string | null>(null);

  protected readonly prompts = ['Lisbon', 'Kyoto', 'Tel Aviv'] as const;

  protected readonly itinerary = structuredCompletionResource({
    debugName: 'structured-output',
    input: this.city,
    schema: ItinerarySchema,
    system: `
      You plan short city breaks. Given a city, produce a two-day weekend
      itinerary. Keep activities concrete and local. Never invent a city
      that does not exist; if the input is not a real place, plan for the
      closest real match and say so in the vibe sentence.
    `,
  });

  protected readonly plan = latchResourceValue(this.itinerary, null);

  protected readonly days = linkedSignal(() => this.plan()?.days ?? []);

  protected planTrip(city: string): void {
    this.city.set(city);
  }

  protected stop(): void {
    this.itinerary.stop();
  }

  protected removeDay(day: Itinerary['days'][number]): void {
    this.days.update((days) => days.filter((candidate) => candidate !== day));
  }
}
