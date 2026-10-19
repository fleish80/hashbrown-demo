import { s } from '@hashbrownai/core';

export const ItinerarySchema = s.object('A weekend itinerary', {
  city: s.string('The city the itinerary is for'),
  vibe: s.streaming.string('One sentence describing the overall vibe of the trip'),
  days: s.streaming.array(
    'One entry per day, in order',
    s.object('A single day of the trip', {
      title: s.string('Short title for the day, e.g. "Saturday: old town"'),
      activities: s.array(
        'Three to five activities for that day',
        s.string('A single activity, one short sentence'),
      ),
    }),
  ),
});

export type Itinerary = s.Infer<typeof ItinerarySchema>;
