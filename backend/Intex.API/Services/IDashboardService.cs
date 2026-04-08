namespace Intex.API.Services;

public record DashboardMetric(string Label, string Value, string? Trend = null);
public record AdminDashboardData(
    IReadOnlyList<DashboardMetric> Summary,
    IReadOnlyList<object> MonthlyMetrics,
    IReadOnlyList<object> SafehouseBreakdown,
    IReadOnlyList<object> UpcomingConferences);

public record PublicOrgSummary(
    int TotalGirlsServed,
    int NumberOfSafehouses,
    int YearsOperating,
    int StaffAndVolunteers);

public interface IDashboardService
{
    Task<AdminDashboardData> GetAdminDashboardAsync();
    Task<IReadOnlyList<object>> GetPublicSnapshotsAsync(int count = 6);
    Task<object?> GetPublicSnapshotByDateAsync(DateOnly snapshotDate);
    Task<PublicOrgSummary> GetPublicOrgSummaryAsync();
}
