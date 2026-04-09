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

// TODO backend: add these to the /api/donor/me response body so in-kind line
// items and allocation breakdowns can be displayed on the donor history page.
export interface InKindDonationItem {
  itemId: number;
  donationId: number;
  itemName: string;
  itemCategory: string;
  quantity: number;
  unitOfMeasure: string | null;
  estimatedUnitValue: number | null;
}

export interface DonationAllocation {
  allocationId: number;
  donationId: number;
  safehouseId?: number | null;
  safeHouseId: number | null;
  programArea: string;
  amountAllocated: number;
  allocationDate: string | null;
}

export interface SupporterDetail {
  supporter: Supporter;
  donations: Donation[];
  // TODO backend: /api/donor/me should include these nested arrays
  inKindItems?: InKindDonationItem[];
  allocations?: DonationAllocation[];
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
