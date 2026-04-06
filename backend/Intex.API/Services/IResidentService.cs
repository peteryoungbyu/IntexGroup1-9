using Intex.API.Models;

namespace Intex.API.Services;

public record ResidentListItem(int ResidentId, string CaseControlNo, string InternalCode, string CaseStatus, string CaseCategory, string? CurrentRiskLevel, int SafehouseId);
public record ResidentDetail(
    Resident Resident,
    IReadOnlyList<ProcessRecording> Recordings,
    IReadOnlyList<HomeVisitation> Visitations,
    IReadOnlyList<InterventionPlan> Plans,
    IReadOnlyList<CaseConference> Conferences,
    IReadOnlyList<PredictionResult> Predictions);

public interface IResidentService
{
    Task<PagedResult<ResidentListItem>> GetAllAsync(int page, int pageSize, string? search, string? status, int? safehouseId);
    Task<ResidentDetail?> GetByIdAsync(int id);
    Task<Resident> CreateAsync(Resident resident);
    Task<Resident?> UpdateAsync(int id, Resident resident);
    Task<bool> DeleteAsync(int id);
}
