using Intex.API.Models;

namespace Intex.API.Services;

public record ResidentListItem(
    int ResidentId,
    string CaseControlNo,
    string InternalCode,
    string CaseStatus,
    string CaseCategory,
    string? CurrentRiskLevel,
    int SafehouseId,
    string? SafehouseName);
public record ResidentSafehouseOption(int SafehouseId, string Name);
public record ResidentFormOptions(
    string NextCaseControlNo,
    string NextInternalCode,
    IReadOnlyList<ResidentSafehouseOption> Safehouses,
    IReadOnlyList<string> CaseStatuses,
    IReadOnlyList<string> BirthStatuses,
    IReadOnlyList<string> CaseCategories,
    IReadOnlyList<string> ReferralSources,
    IReadOnlyList<string> ReintegrationTypes,
    IReadOnlyList<string> ReintegrationStatuses,
    IReadOnlyList<string> RiskLevels,
    IReadOnlyList<string> Religions,
    IReadOnlyList<string> AssignedSocialWorkers,
    IReadOnlyList<string> InitialCaseAssessments);
public record ResidentDetail(
    Resident Resident,
    IReadOnlyList<ProcessRecording> Recordings,
    IReadOnlyList<HomeVisitation> Visitations,
    IReadOnlyList<InterventionPlan> Plans,
    IReadOnlyList<CaseConference> Conferences,
    IReadOnlyList<PredictionResult> Predictions);

public interface IResidentService
{
    Task<PagedResult<ResidentListItem>> GetAllAsync(int page, int pageSize, string? search, string? status, int? safehouseId, string? caseCategory);
    Task<ResidentDetail?> GetByIdAsync(int id);
    Task<ResidentFormOptions> GetFormOptionsAsync();
    Task<Resident> CreateAsync(CreateResidentRequest request);
    Task<Resident?> UpdateAsync(int id, Resident resident);
    Task<bool> DeleteAsync(int id);
}
