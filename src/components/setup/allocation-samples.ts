// Static sample-season fixtures used by the Allocation Model preview.
// Pure data — no DB calls.

export type AllocationModelKey =
  | 'rotating_selection'
  | 'static_weeks'
  | 'first_come_first_serve';

export interface SampleWeek {
  label: string;          // e.g. "May 22"
  family?: string;        // family group name occupying that week (undefined = open)
  note?: string;          // e.g. "1st pick", "Static", "Open"
}

export interface SampleSeason {
  title: string;
  subtitle: string;
  families: string[];     // 4 fake family group names, color-coded by index
  weeks: SampleWeek[];
}

export const FAMILY_NAMES = ['Anderson', 'Brooks', 'Chen', 'Diaz'] as const;

const WEEK_LABELS = [
  'May 22', 'May 29', 'Jun 5', 'Jun 12', 'Jun 19', 'Jun 26',
  'Jul 3', 'Jul 10', 'Jul 17', 'Jul 24', 'Jul 31',
  'Aug 7', 'Aug 14', 'Aug 21', 'Aug 28', 'Sep 4',
];

export const SAMPLES: Record<AllocationModelKey, SampleSeason> = {
  rotating_selection: {
    title: 'Rotating Selection — Sample Season',
    subtitle:
      'Each year the pick order rotates. In year 1 Anderson picks first; in year 2 Brooks picks first; and so on. Everyone gets a chance at the prime weeks over time.',
    families: [...FAMILY_NAMES],
    weeks: WEEK_LABELS.map((label, i) => {
      // 1st-pick round, then 2nd-pick round, then open
      const pick1 = ['Anderson', 'Brooks', 'Chen', 'Diaz'];
      const pick2 = ['Diaz', 'Chen', 'Brooks', 'Anderson'];
      if (i < 4) return { label, family: pick1[i], note: '1st pick' };
      if (i < 8) return { label, family: pick2[i - 4], note: '2nd pick' };
      if (i < 12) return { label, family: pick1[(i + 1) % 4], note: '3rd pick' };
      return { label, note: 'Open / first-come' };
    }),
  },
  static_weeks: {
    title: 'Static Weeks — Sample Season',
    subtitle:
      'Each family owns the same weeks every year. Predictable and easy — no annual picking process needed.',
    families: [...FAMILY_NAMES],
    weeks: WEEK_LABELS.map((label, i) => {
      // Each family gets 4 fixed weeks scattered across the season
      const owners = ['Anderson', 'Brooks', 'Chen', 'Diaz'];
      return { label, family: owners[i % 4], note: 'Same week, every year' };
    }),
  },
  first_come_first_serve: {
    title: 'First Come, First Served — Sample Season',
    subtitle:
      'The whole season starts open. Families book whenever they want, and the calendar fills up as people claim time.',
    families: [...FAMILY_NAMES],
    weeks: WEEK_LABELS.map((label, i) => {
      // A handful of weeks already booked; most still open
      const bookings: Record<number, string> = {
        2: 'Anderson',
        4: 'Diaz',
        7: 'Brooks',
        8: 'Brooks',
        11: 'Chen',
        13: 'Anderson',
      };
      return bookings[i]
        ? { label, family: bookings[i], note: 'Booked' }
        : { label, note: 'Open' };
    }),
  },
};

export const MODEL_META: Record<
  AllocationModelKey,
  {
    friendlyName: string;
    tagline: string;
    bestFor: string;
    bullets: { label: string; value: string }[];
  }
> = {
  rotating_selection: {
    friendlyName: 'Rotating Selection',
    tagline: 'Take turns picking weeks each year',
    bestFor: 'Families who want fairness across prime weeks',
    bullets: [
      { label: 'How picks happen', value: 'Each family picks in turn during a yearly selection window' },
      { label: 'Year-to-year', value: 'Pick order rotates so no family is always last' },
      { label: 'Who manages it', value: 'Admin sets rotation order; system advances turns automatically' },
    ],
  },
  static_weeks: {
    friendlyName: 'Static Weeks',
    tagline: 'Same week every year, forever',
    bestFor: 'Families with predictable schedules and traditions',
    bullets: [
      { label: 'How picks happen', value: 'Each family is permanently assigned specific weeks' },
      { label: 'Year-to-year', value: 'Same assignments repeat — no annual selection needed' },
      { label: 'Who manages it', value: 'Admin assigns weeks once; families just confirm their stays' },
    ],
  },
  first_come_first_serve: {
    friendlyName: 'First Come, First Served',
    tagline: 'Open calendar, anyone books anytime',
    bestFor: 'Smaller groups or cabins with lots of unclaimed time',
    bullets: [
      { label: 'How picks happen', value: 'Anyone can book any open dates at any time' },
      { label: 'Year-to-year', value: 'Calendar resets each year — nothing reserved in advance' },
      { label: 'Who manages it', value: 'Largely self-serve; admin steps in only for conflicts' },
    ],
  },
};

export const PREVIEW_FAQS: { q: string; a: string }[] = [
  {
    q: 'Can I switch allocation models later?',
    a: 'Yes. You can change the model from Reservation Setup at any time. Existing reservations are kept, but rotation order or static assignments may need to be re-entered depending on which model you switch to.',
  },
  {
    q: 'What if two families want the same week?',
    a: 'In Rotating Selection, the pick order decides. In Static Weeks, only the assigned family can book that week. In First Come, First Served, whoever books first gets it.',
  },
  {
    q: 'How does the rotation order get decided?',
    a: 'You set it manually in Reservation Setup the first time. After that, the system rotates automatically each year so the same family is not always picking last.',
  },
  {
    q: 'Do families have to take a full week?',
    a: 'During the rotation selection period, yes — picks are full Friday-to-Friday weeks. After everyone has made their picks, the remaining calendar becomes first-come and partial-week stays are allowed.',
  },
  {
    q: 'What happens to weeks no one picks?',
    a: 'They roll into a free-for-all phase where any family can book on a first-come basis until the season starts.',
  },
  {
    q: 'Can we mix models — static for some weeks, rotating for others?',
    a: 'Not directly today. The simplest approach is to use Static Weeks and let the admin reserve a few weeks as “open” so families can claim them first-come.',
  },
];
