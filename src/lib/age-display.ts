const BAND_LABELS: Record<string, string> = {
  u18: 'Younger than 18',
  '18-22': '18-22 years old',
  '23-29': '23-29 years old',
  '30-39': '30-39 years old',
  '40-49': '40-49 years old',
  '50-59': '50-59 years old',
  '60+': '60 or older',
};

function parseDobIso(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return value;
}

function ageYearsFromDobIso(dobIso: string, now = new Date()): number | null {
  const parsed = parseDobIso(dobIso);
  if (!parsed) return null;
  const [y, m, d] = parsed.split('-').map(Number);
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month < m || (month === m && day < d)) age -= 1;
  return age;
}

function ageBandIdFromYears(age: number): string {
  if (age < 18) return 'u18';
  if (age <= 22) return '18-22';
  if (age <= 29) return '23-29';
  if (age <= 39) return '30-39';
  if (age <= 49) return '40-49';
  if (age <= 59) return '50-59';
  return '60+';
}

export function ageBandLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return BAND_LABELS[id] ?? id;
}

export function formatDobWithBand(dobIso: string | null | undefined): string | null {
  const parsed = parseDobIso(dobIso ?? null);
  if (!parsed) return null;
  const [y, m, d] = parsed.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const formatted = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const years = ageYearsFromDobIso(parsed);
  if (years == null) return formatted;
  const label = ageBandLabel(ageBandIdFromYears(years));
  return label ? `${formatted} (${label})` : formatted;
}

export function formatClientAgeDisplay(profile: {
  birth_date?: string | null;
}): string {
  if (profile.birth_date) {
    return formatDobWithBand(profile.birth_date) ?? '-';
  }
  return '-';
}