import type {Client, ClientSummary} from '@/api/types';

export function toClientSummary(client: Client): ClientSummary {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    location: client.profile?.location ?? '—',
    services: client.matchPrefs?.services ?? [],
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

function displayValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  return value;
}

function displayList(values: string[] | undefined) {
  if (!values?.length) {
    return '';
  }
  return values.map(displayValue).filter(Boolean).join(', ');
}

/** Steps aligned with live mobile MatchScreen onboarding. */
export function clientMatchPrefRows(client: Client): MatchPrefRow[] {
  const prefs = client.matchPrefs ?? {
    services: [],
    formats: [],
    days: [],
    times: [],
    ages: [],
    languages: [],
  };
  const profile = client.profile ?? {};
  return [
    {step: 1, label: 'Services', value: displayList(prefs.services) || '—'},
    {
      step: 2,
      label: 'Training formats',
      value: displayList(prefs.formats) || '—',
    },
    {
      step: 3,
      label: 'Frequency',
      value: displayValue(prefs.frequency) || '—',
    },
    {step: 4, label: 'Preferred days', value: displayList(prefs.days) || '—'},
    {
      step: 5,
      label: 'Preferred times',
      value:
        (displayList(prefs.times) || '—') +
        (prefs.timesOther ? ` (${prefs.timesOther})` : ''),
    },
    {
      step: 6,
      label: 'Current routine',
      value:
        (displayValue(prefs.routine) || '—') +
        (prefs.routineOther ? ` (${prefs.routineOther})` : ''),
    },
    {
      step: 7,
      label: 'Gender preference',
      value: displayValue(prefs.gender) || '—',
    },
    {
      step: 8,
      label: 'Coaching style',
      value: displayValue(prefs.style) || '—',
    },
    {
      step: 9,
      label: 'Personal details',
      value: [
        displayValue(profile.gender) || null,
        displayValue(profile.age) || null,
        displayValue(profile.gymAccess) || null,
        profile.location || null,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
    },
    {
      step: 10,
      label: 'Languages',
      value: displayList(prefs.languages) || '—',
    },
    {
      step: 11,
      label: 'When to start',
      value: displayValue(prefs.startTraining) || '—',
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
