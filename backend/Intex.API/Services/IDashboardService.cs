namespace Intex.API.Services;

public record DashboardMetric(string Label, string Value, string? Trend = null);
public record AdminDashboardData(
    IReadOnlyList<DashboardMetric> Summary,
    IReadOnlyList<object> MonthlyMetrics,
    IReadOnlyList<object> SafehouseBreakdown,
    IReadOnlyList<object> UpcomingConferences);

public interface IDashboardService
{
    Task<AdminDashboardData> GetAdminDashboardAsync();
    Task<IReadOnlyList<object>> GetPublicSnapshotsAsync(int count = 6);
}
