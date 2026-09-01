export type LookupGroupId =
  | 'services'
  | 'formats'
  | 'frequency'
  | 'startTraining'
  | 'days'
  | 'times'
  | 'routine'
  | 'genderPreference'
  | 'style'
  | 'languages'
  | 'gender'
  | 'age'
  | 'ethnicity'
  | 'gymAccess'
  | 'proLocationTypes'
  | 'docTypes'
  | 'verificationStatus'
  | 'quoteRequestStatus'
  | 'creditTxnType'
  | 'paymentMethod';

export type LookupOption = {
  id: number;
  groupId: LookupGroupId;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
  system: boolean;
};

export type LookupGroupMeta = {
  id: LookupGroupId;
  title: string;
  hint: string;
  /** System enums: labels can change, values cannot be added or removed. */
  locked: boolean;
};

export type AppSettings = {
  otpLength: number;
  otpResendSeconds: number;
  defaultPhonePrefix: string;
  vatRate: number;
  maxGoals: number;
  /** Credits at 100% match; unlock cost = round(50 × match% / 100). Kept for docs only. */
  fullMatchUnlockCredits?: number;
};
