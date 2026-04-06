export interface ResidentListItem {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  caseStatus: string;
  caseCategory: string;
  currentRiskLevel: string | null;
  safehouseId: number;
}

export interface Resident {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  caseCategory: string;
  currentRiskLevel: string | null;
  initialRiskLevel: string | null;
  reintegrationStatus: string | null;
  reintegrationType: string | null;
  assignedSocialWorker: string | null;
  dateOfAdmission: string;
  dateEnrolled: string | null;
  dateClosed: string | null;
  referralSource: string | null;
  createdAt: string;
}

export interface ProcessRecording {
  recordingId: number;
  residentId: number;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
}

export interface HomeVisitation {
  visitationId: number;
  residentId: number;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  purpose: string | null;
  observations: string | null;
  familyCooperationLevel: string | null;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string | null;
  visitOutcome: string | null;
}

export interface CaseConference {
  conferenceId: number;
  residentId: number;
  conferenceDate: string;
  facilitatedBy: string;
  attendees: string;
  agenda: string;
  decisions: string | null;
  nextSteps: string | null;
  nextReviewDate: string | null;
}

export interface PredictionResult {
  predictionId: number;
  residentId: number | null;
  supporterId: number | null;
  modelName: string;
  score: number;
  label: string | null;
  featureImportanceJson: string | null;
  generatedAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ResidentDetail {
  resident: Resident;
  recordings: ProcessRecording[];
  visitations: HomeVisitation[];
  plans: any[];
  conferences: CaseConference[];
  predictions: PredictionResult[];
}
