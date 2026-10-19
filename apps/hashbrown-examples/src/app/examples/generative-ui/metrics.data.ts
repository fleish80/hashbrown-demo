export interface Metric {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly changePercent: number;
}

export const METRICS: readonly Metric[] = [
  { key: 'active-users', label: 'Active users', value: 12480, unit: '', changePercent: 6.2 },
  { key: 'signups', label: 'New signups', value: 342, unit: '', changePercent: -3.1 },
  { key: 'mrr', label: 'Monthly revenue', value: 58200, unit: 'USD', changePercent: 4.8 },
  { key: 'churn', label: 'Churn rate', value: 2.1, unit: '%', changePercent: 0 },
  { key: 'latency', label: 'p95 latency', value: 310, unit: 'ms', changePercent: -12.5 },
];
