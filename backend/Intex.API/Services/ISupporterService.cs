using Intex.API.Models;

namespace Intex.API.Services;

public record SupporterListItem(int SupporterId, string DisplayName, string SupporterType, string Status, decimal TotalDonated, DateOnly? FirstDonationDate);
public record SupporterChurnItem(int SupporterId, string DisplayName, decimal? ChurnProbability, bool? LikelyChurn);
public record SupporterFormOptions(
    IReadOnlyList<string> SupporterTypes,
    IReadOnlyList<string> RelationshipTypes,
    IReadOnlyList<string> Regions,
    IReadOnlyList<string> Countries,
    IReadOnlyList<string> AcquisitionChannels,
    IReadOnlyList<string> Statuses);
public record SupporterDetail(
    Supporter Supporter,
    IReadOnlyList<Donation> Donations,
    IReadOnlyList<InKindDonationItem> InKindItems,
    IReadOnlyList<DonationAllocation> Allocations);
public record DonorPledgeOptions(
    IReadOnlyList<string> ProgramAreas,
    IReadOnlyList<int> SafehouseIds);
public record CreateSupporterDonationRequest(
    decimal Amount,
    bool IsRecurring,
    string? ProgramArea,
    int? SafehouseId);
public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

public interface ISupporterService
{
    Task<PagedResult<SupporterListItem>> GetAllAsync(int page, int pageSize, string? search, string? status);
    Task<SupporterFormOptions> GetFormOptionsAsync();
    Task<IReadOnlyList<SupporterChurnItem>> GetChurnPredictionsAsync();
    Task<SupporterDetail?> GetByIdAsync(int id);
    Task<SupporterDetail?> GetByUserAsync(string userId, string? email);
    Task<Supporter> CreateAsync(Supporter supporter);
    Task<Supporter?> UpdateAsync(int id, Supporter supporter);
    Task<bool> DeleteAsync(int id);
    Task<Donation> AddDonationAsync(int supporterId, CreateSupporterDonationRequest request);
    Task<DonorPledgeOptions> GetDonorPledgeOptionsAsync();
    Task<Donation> CreateDonorPledgeAsync(
        string userId,
        string email,
        decimal amount,
        bool isRecurring,
        string? selectedProgramArea,
        int? selectedSafehouseId);
    Task<bool> DeleteDonationAsync(int supporterId, int donationId);
}
