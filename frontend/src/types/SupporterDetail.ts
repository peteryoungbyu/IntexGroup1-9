export interface Supporter {
  supporterId: number;
  supporterType: string;
  displayName: string;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  region: string | null;
  country: string | null;
  firstDonationDate: string | null;
  acquisitionChannel: string | null;
  createdAt: string;
}

export interface Donation {
  donationId: number;
  supporterId: number;
  donationType: string;
  donationDate: string;
  channelSource: string | null;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number | null;
  impactUnit: string | null;
  isRecurring: boolean;
  campaignName: string | null;
  notes: string | null;
}

export interface SupporterDetail {
  supporter: Supporter;
  donations: Donation[];
}

export interface SupporterListItem {
  supporterId: number;
  displayName: string;
  supporterType: string;
  status: string;
  totalDonated: number;
  firstDonationDate: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
