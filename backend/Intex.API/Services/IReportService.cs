namespace Intex.API.Services;

public record ReportSection(string Title, string Description, object Data);

public interface IReportService
{
    Task<IReadOnlyList<ReportSection>> GetAnnualAccomplishmentAsync(int year);
    Task<ReportSection> GetDonationTrendsAsync(int months = 12);
    Task<ReportSection> GetReintegrationOutcomesAsync();
    Task<ReportSection> GetSafehouseComparisonAsync();
}
