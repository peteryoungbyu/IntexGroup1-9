export const RESIDENT_SAFEHOUSE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const RESIDENT_CASE_STATUSES = [
  'Active',
  'Closed',
  'Transferred',
] as const;

export const RESIDENT_BIRTH_STATUSES = ['Marital', 'Non-Marital'] as const;

export const RESIDENT_CASE_CATEGORIES = [
  'Abandoned',
  'Foundling',
  'Surrendered',
  'Neglected',
] as const;

export const RESIDENT_REFERRAL_SOURCES = [
  'Government Agency',
  'NGO',
  'Police',
  'Self-Referral',
  'Community',
  'Court Order',
] as const;

export const RESIDENT_REINTEGRATION_TYPES = [
  'Family Reunification',
  'Foster Care',
  'Adoption (Domestic)',
  'Adoption (Inter-Country)',
  'Independent Living',
  'None',
] as const;

export const RESIDENT_REINTEGRATION_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
  'On Hold',
] as const;

export const RESIDENT_RISK_LEVELS = [
  'Low',
  'Medium',
  'High',
  'Critical',
] as const;
