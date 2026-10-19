import { createUiKit, exposeComponent } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { InfoCardComponent } from './ui/info-card.component';
import { MetricNoteComponent } from './ui/metric-note.component';
import { STAT_TRENDS, StatCardComponent } from './ui/stat-card.component';

const markdown = exposeComponent(MetricNoteComponent, {
  name: 'Markdown',
  description:
    'Render markdown text for the user: commentary, lists or links. Write all markdown into the children prop.',
  input: {
    children: s.streaming.string('Markdown content to render'),
  },
});

const statCard = exposeComponent(StatCardComponent, {
  name: 'StatCard',
  description: 'A compact tile showing one metric with a trend arrow',
  input: {
    label: s.string('Human-readable metric name'),
    value: s.string('Formatted value including unit, e.g. "12,480" or "310 ms"'),
    trend: s.enumeration('Direction of change since last period', [...STAT_TRENDS]),
  },
});

// `children` only adds nesting; it never restricts. Every component here is also offered at the top
// level, so grouping StatCards inside an InfoCard relies on the descriptions and the system prompt.
export const dashboardUiKit = createUiKit({
  components: [
    markdown,
    statCard,
    exposeComponent(InfoCardComponent, {
      name: 'InfoCard',
      description: 'A titled card that groups related StatCards, with optional Markdown notes',
      input: {
        title: s.string('Card heading'),
      },
      children: [statCard, markdown],
    }),
  ],
});
