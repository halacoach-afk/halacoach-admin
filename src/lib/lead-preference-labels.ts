import type {LeadDetail, LeadSummary} from '@/api/types';

const FORMAT_LABELS: Record<string, string> = {
  client: "Client's location",
  coach: "Coach's location",
  online: 'Online',
  online_live: 'Online live',
};

const FREQUENCY_LABELS: Record<string, string> = {
  '1-2': '1–2 times/week',
  '3-4': '3–4 times/week',
  '5+': '5+ times/week',
};

const DAY_LABELS: Record<string, string> = {
  any: 'Any day',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const TIME_LABELS: Record<string, string> = {
  any: 'Any time',
  'early-morning': 'Early morning (before 9am)',
  morning: 'Morning (9am–noon)',
  'early-afternoon': 'Early afternoon (noon–3pm)',
  'late-afternoon': 'Late afternoon (3–6pm)',
  evening: 'Evening (after 6pm)',
  other: 'Other',
};

const START_LABELS: Record<string, string> = {
  asap: 'As soon as possible',
  'next-week': 'Next week',
  'two-weeks': 'In 2 weeks',
  month: 'Within a month',
  'few-months': 'Within a few months',
};

const ROUTINE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  competitive: 'Competitive',
  none: 'I don’t exercise at all',
  hour: 'I exercise for around an hour a week',
  couple: 'I exercise a couple of times a week',
  other: 'Other',
  light: 'I exercise for around an hour a week',
  regular: 'I exercise a couple of times a week',
  intense: 'Other',
};

const GENDER_LABELS: Record<string, string> = {
  any: 'No preference',
  male: 'Male',
  female: 'Female',
};

const STYLE_LABELS: Record<string, string> = {
  strict: 'Strict / disciplined',
  supportive: 'Supportive / encouraging',
  educational: 'Educational / explanatory',
  challenging: 'Supportive / encouraging',
  technical: 'Educational / explanatory',
  flexible: 'Supportive / encouraging',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  english: 'English',
  ar: 'Arabic',
  arabic: 'Arabic',
};

const AGE_LABELS: Record<string, string> = {
  u18: 'Younger than 18',
  '18-22': '18–22 years old',
  '23-29': '23–29 years old',
  '30-39': '30–39 years old',
  '40-49': '40–49 years old',
  '50-59': '50–59 years old',
  '60+': '60 or older',
};

function mapId(id: string | null | undefined, labels: Record<string, string>) {
  const key = id?.trim();
  if (!key) {
    return null;
  }
  return labels[key] ?? key;
}

function mapIds(ids: string[] | undefined, labels: Record<string, string>) {
  if (!ids?.length) {
    return null;
  }
  const mapped = ids.map(id => mapId(id, labels) ?? id).filter(Boolean);
  return mapped.length ? mapped.join(', ') : null;
}

export type LeadPreferenceSource = Pick<
  LeadSummary,
  | 'goal'
  | 'service'
  | 'location'
  | 'frequency'
  | 'format'
  | 'days'
  | 'time'
  | 'formatId'
  | 'frequencyId'
  | 'dayIds'
  | 'timeIds'
  | 'timesOther'
  | 'startTraining'
  | 'routine'
  | 'routineOther'
  | 'gender'
  | 'style'
  | 'languages'
  | 'ages'
  | 'goalDetail'
> &
  Partial<Pick<LeadDetail, 'radiusKm'>>;

export type LeadPreferenceDisplay = {
  goal: string;
  format: string;
  frequency: string;
  days: string;
  times: string;
  start: string;
  experience: string;
  coachGender: string;
  coachStyle: string;
  languages: string;
  ages: string;
  location: string;
  radius: string;
  goalDetails: string;
};

export function leadPreferenceDisplay(
  row: LeadPreferenceSource,
  serviceName?: string,
): LeadPreferenceDisplay {
  const format =
    mapId(row.formatId ?? row.format, FORMAT_LABELS) ??
    row.format?.trim() ??
    '-';

  const frequency =
    mapId(row.frequencyId ?? row.frequency, FREQUENCY_LABELS) ??
    row.frequency?.trim() ??
    '-';

  const days =
    mapIds(row.dayIds, DAY_LABELS) ??
    (typeof row.days === 'string' ? row.days.trim() || '-' : '-');

  let times = mapIds(row.timeIds, TIME_LABELS);
  if (row.timeIds?.includes('other') && row.timesOther?.trim()) {
    times = row.timeIds
      .map(id =>
        id === 'other' ? row.timesOther!.trim() : mapId(id, TIME_LABELS) ?? id,
      )
      .join(', ');
  }
  if (!times) {
    times = row.time?.trim() || '-';
  }

  const routineLabel = mapId(row.routine, ROUTINE_LABELS);
  const routineOther = row.routineOther?.trim() || '';
  const experience =
    row.routine === 'other' && routineOther
      ? routineOther
      : routineLabel && routineOther
        ? `${routineLabel} (${routineOther})`
        : routineLabel || routineOther || '-';

  const languages =
    mapIds(row.languages, LANGUAGE_LABELS) ??
    (row.languages?.length ? row.languages.join(', ') : '-');

  const ages =
    mapIds(row.ages, AGE_LABELS) ?? (row.ages?.length ? row.ages.join(', ') : '-');

  const radiusKm =
    row.radiusKm != null && Number.isFinite(row.radiusKm) && row.radiusKm > 0
      ? Math.round(row.radiusKm)
      : null;

  return {
    goal: serviceName?.trim() || row.service?.trim() || row.goal?.trim() || '-',
    format,
    frequency,
    days,
    times,
    start: mapId(row.startTraining, START_LABELS) ?? '-',
    experience,
    coachGender: mapId(row.gender, GENDER_LABELS) ?? '-',
    coachStyle: mapId(row.style, STYLE_LABELS) ?? '-',
    languages,
    ages,
    location: row.location?.trim() || '-',
    radius: radiusKm != null ? `${radiusKm} km` : '-',
    goalDetails: row.goalDetail?.trim() || '-',
  };
}

export const LEAD_PREFERENCE_FIELDS: Array<{
  key: keyof LeadPreferenceDisplay;
  label: string;
}> = [
  {key: 'goal', label: 'Goal'},
  {key: 'goalDetails', label: 'Goal details'},
  {key: 'format', label: 'Format'},
  {key: 'frequency', label: 'Frequency'},
  {key: 'days', label: 'Days'},
  {key: 'times', label: 'Times'},
  {key: 'start', label: 'Start'},
  {key: 'experience', label: 'Experience & activity'},
  {key: 'coachGender', label: 'Coach gender'},
  {key: 'coachStyle', label: 'Coach style'},
  {key: 'languages', label: 'Languages'},
  {key: 'location', label: 'Location'},
  {key: 'radius', label: 'Travel radius'},
];
