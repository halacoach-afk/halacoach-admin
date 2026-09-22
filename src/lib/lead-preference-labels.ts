import type {LeadSummary} from '@/api/types';

const FORMAT_LABELS: Record<string, string> = {
  client: 'Client location',
  coach: 'Coach location',
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
  location: string;
  goalDetails: string;
};

export function leadPreferenceDisplay(
  row: LeadSummary,
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
    (row.days?.trim() || '-');

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

  const experience =
    row.routine === 'other' && row.routineOther?.trim()
      ? row.routineOther.trim()
      : mapId(row.routine, ROUTINE_LABELS) ?? '-';

  const languages =
    mapIds(row.languages, LANGUAGE_LABELS) ??
    (row.languages?.length ? row.languages.join(', ') : '-');

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
    location: row.location?.trim() || '-',
    goalDetails: row.goalDetail?.trim() || '-',
  };
}
