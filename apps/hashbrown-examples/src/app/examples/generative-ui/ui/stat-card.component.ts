import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export const STAT_TRENDS = ['flat', 'up', 'down'] as const;
export type StatTrend = (typeof STAT_TRENDS)[number];

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.stat-up]': 'trend() === "up"',
    '[class.stat-down]': 'trend() === "down"',
  },
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input<StatTrend>('flat');

  protected readonly arrow = computed(() => {
    switch (this.trend()) {
      case 'up':
        return '▲';
      case 'down':
        return '▼';
      default:
        return '—';
    }
  });
}
