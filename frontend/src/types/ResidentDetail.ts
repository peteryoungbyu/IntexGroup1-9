export interface ResidentListItem {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  caseStatus: string;
  caseCategory: string;
  currentRiskLevel: string | null;
  safehouseId: number;
  safehouseName: string | null;
}

export interface ResidentSafehouseOption {
  safehouseId: number;
  name: string;
}

export interface CreateResidentRequest {
  safehouseId: number;
  caseStatus: string;
  dateOfBirth: string;
  birthStatus: string;
  placeOfBirth: string;
  religion: string;
  caseCategory: string;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
  isPwd: boolean;
  pwdType: string | null;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string | null;
  familyIs4Ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  referralSource: string;
  referringAgencyPerson: string | null;
  assignedSocialWorker: string;
  initialCaseAssessment: string;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  initialRiskLevel: string;
  currentRiskLevel: string;
}

export interface ResidentFormOptions {
  nextCaseControlNo: string;
  nextInternalCode: string;
  safehouses: ResidentSafehouseOption[];
  caseStatuses: string[];
  birthStatuses: string[];
  caseCategories: string[];
  referralSources: string[];
  reintegrationTypes: string[];
  reintegrationStatuses: string[];
  riskLevels: string[];
  religions: string[];
  assignedSocialWorkers: string[];
  initialCaseAssessments: string[];
}

export interface Resident {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  birthStatus: string | null;
  placeOfBirth: string | null;
  religion: string | null;
  caseCategory: string;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
  isPwd: boolean;
  pwdType: string | null;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string | null;
  familyIs4Ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  ageUponAdmission: string | null;
  presentAge: string | null;
  lengthOfStay: string | null;
  referralSource: string | null;
  referringAgencyPerson: string | null;
  dateColbRegistered: string | null;
  dateColbObtained: string | null;
  assignedSocialWorker: string | null;
  initialCaseAssessment: string | null;
  dateCaseStudyPrepared: string | null;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  initialRiskLevel: string | null;
  currentRiskLevel: string | null;
  dateEnrolled: string | null;
  dateClosed: string | null;
  notesRestricted: string | null;
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
  notesRestricted?: string | null;
}

export interface ProcessRecordingFormResidentOption {
  residentId: number;
  caseControlNo: string;
}

export interface ProcessRecordingFormOptions {
  residents: ProcessRecordingFormResidentOption[];
  socialWorkers: string[];
  emotionalStateObserved: string[];
  emotionalStateEnd: string[];
  followUpActions: string[];
}

export interface SessionEntryRecordingRequest {
  sessionDate: string;
  socialWorker: string;
  sessionType: 'Individual' | 'Group';
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  interventionsApplied: string[];
  followUpActions: string;
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
