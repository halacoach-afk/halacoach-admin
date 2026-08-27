import type {Client, ClientSummary} from '@/api/types';
import type {LookupOption} from '@/api/lookups';

export function toClientSummary(client: Client): ClientSummary {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    location: client.profile?.location ?? '—',
    goals: client.matchPrefs?.goals ?? [],
    onboarded: client.onboarded,
    otpVerified: client.otpVerified,
    suspended: client.suspended,
    savedCount: client.savedCoachIds.length,
    createdAt: client.createdAt,
    lastActiveAt: client.lastActiveAt,
  };
}

type MatchPrefRow = {
  step: number;
  label: string;
  value: string;
};

function labelFor(lookups: LookupOption[], groupId: string, value: string) {
  return lookups.find(item => item.groupId === groupId && item.value === value)?.label ?? value;
}

function labelsFor(lookups: LookupOption[], groupId: string, values: string[]) {
  return values.map(value => labelFor(lookups, groupId, value)).join(', ');
}

/** Steps aligned with live mobile MatchScreen onboarding. */
export function clientMatchPrefRows(client: Client, lookups: LookupOption[]): MatchPrefRow[] {
  const prefs = client.matchPrefs ?? {
    goals: [],
    formats: [],
    days: [],
    times: [],
    ages: [],
    languages: [],
  };
  const profile = client.profile ?? {};
  return [
    {step: 1, label: 'Goals', value: labelsFor(lookups, 'goals', prefs.goals) || '—'},
    {
      step: 2,
      label: 'Training formats',
      value: prefs.formats.length
        ? labelsFor(lookups, 'formats', prefs.formats)
        : '—',
    },
    {
      step: 3,
      label: 'Frequency',
      value: prefs.frequency ? labelFor(lookups, 'frequency', prefs.frequency) : '—',
    },
    {step: 4, label: 'Preferred days', value: labelsFor(lookups, 'days', prefs.days) || '—'},
    {
      step: 5,
      label: 'Preferred times',
      value:
        (labelsFor(lookups, 'times', prefs.times) || '—') +
        (prefs.timesOther ? ` (${prefs.timesOther})` : ''),
    },
    {
      step: 6,
      label: 'Current routine',
      value:
        (prefs.routine ? labelFor(lookups, 'routine', prefs.routine) : '—') +
        (prefs.routineOther ? ` (${prefs.routineOther})` : ''),
    },
    {
      step: 7,
      label: 'Gender preference',
      value: prefs.genderPreference
        ? labelFor(lookups, 'genderPreference', prefs.genderPreference)
        : '—',
    },
    {
      step: 8,
      label: 'Coaching style',
      value: prefs.style ? labelFor(lookups, 'style', prefs.style) : '—',
    },
    {
      step: 9,
      label: 'Personal details',
      value: [
        profile.gender ? labelFor(lookups, 'gender', profile.gender) : null,
        profile.age ? labelFor(lookups, 'age', profile.age) : null,
        profile.gymAccess ? labelFor(lookups, 'gymAccess', profile.gymAccess) : null,
        profile.location || null,
        profile.ethnicity ? labelFor(lookups, 'ethnicity', profile.ethnicity) : null,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
    },
    {
      step: 10,
      label: 'Languages',
      value: labelsFor(lookups, 'languages', prefs.languages) || '—',
    },
    {
      step: 11,
      label: 'When to start',
      value: prefs.startTraining
        ? labelFor(lookups, 'startTraining', prefs.startTraining)
        : '—',
    },
    {
      step: 12,
      label: 'Account',
      value: [client.email, client.phone].filter(Boolean).join(' · ') || '—',
    },
  ];
}

/** @deprecated Use clientMatchPrefRows */
export const clientAnswerRows = clientMatchPrefRows;

export const consentLabels = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  independent: 'Independent professionals / coach agreement',
  contact: 'Contact by matching coaches',
} as const;
