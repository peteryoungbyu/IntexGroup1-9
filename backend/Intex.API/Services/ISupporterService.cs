using Intex.API.Models;

namespace Intex.API.Services;

public record SupporterListItem(int SupporterId, string DisplayName, string SupporterType, string Status, decimal TotalDonated, DateOnly? FirstDonationDate);
public record SupporterChurnItem(int SupporterId, string DisplayName, decimal? ChurnProbability, bool? LikelyChurn);
public record SupporterDetail(
    Supporter Supporter,
    IReadOnlyList<Donation> Donations,
    IReadOnlyList<InKindDonationItem> InKindItems,
    IReadOnlyList<DonationAllocation> Allocations);
public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

public interface ISupporterService
{
    Task<PagedResult<SupporterListItem>> GetAllAsync(int page, int pageSize, string? search, string? status);
    Task<IReadOnlyList<SupporterChurnItem>> GetChurnPredictionsAsync();
    Task<SupporterDetail?> GetByIdAsync(int id);
    Task<SupporterDetail?> GetByUserAsync(string userId, string? email);
    Task<Supporter> CreateAsync(Supporter supporter);
    Task<Supporter?> UpdateAsync(int id, Supporter supporter);
    Task<bool> DeleteAsync(int id);
    Task<Donation> AddDonationAsync(int supporterId, Donation donation);
    Task<Donation> CreateDonorPledgeAsync(string userId, string email, decimal amount, bool isRecurring);
    Task<bool> DeleteDonationAsync(int supporterId, int donationId);
}
