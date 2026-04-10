namespace Intex.API.Services;

public sealed class CreateResidentRequest
{
    public int SafehouseId { get; set; }
    public string CaseStatus { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string BirthStatus { get; set; } = string.Empty;
    public string PlaceOfBirth { get; set; } = string.Empty;
    public string Religion { get; set; } = string.Empty;
    public string CaseCategory { get; set; } = string.Empty;
    public bool SubCatOrphaned { get; set; }
    public bool SubCatTrafficked { get; set; }
    public bool SubCatChildLabor { get; set; }
    public bool SubCatPhysicalAbuse { get; set; }
    public bool SubCatSexualAbuse { get; set; }
    public bool SubCatOsaec { get; set; }
    public bool SubCatCicl { get; set; }
    public bool SubCatAtRisk { get; set; }
    public bool SubCatStreetChild { get; set; }
    public bool SubCatChildWithHiv { get; set; }
    public bool IsPwd { get; set; }
    public string? PwdType { get; set; }
    public bool HasSpecialNeeds { get; set; }
    public string? SpecialNeedsDiagnosis { get; set; }
    public bool FamilyIs4Ps { get; set; }
    public bool FamilySoloParent { get; set; }
    public bool FamilyIndigenous { get; set; }
    public bool FamilyParentPwd { get; set; }
    public bool FamilyInformalSettler { get; set; }
    public DateOnly DateOfAdmission { get; set; }
    public string ReferralSource { get; set; } = string.Empty;
    public string? ReferringAgencyPerson { get; set; }
    public string AssignedSocialWorker { get; set; } = string.Empty;
    public string InitialCaseAssessment { get; set; } = string.Empty;
    public string? ReintegrationType { get; set; }
    public string? ReintegrationStatus { get; set; }
    public string InitialRiskLevel { get; set; } = string.Empty;
    public string CurrentRiskLevel { get; set; } = string.Empty;
}
