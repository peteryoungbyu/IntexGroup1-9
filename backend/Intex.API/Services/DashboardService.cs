using Intex.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    public async Task<AdminDashboardData> GetAdminDashboardAsync()
    {
        var totalResidents = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
        var totalSupporters = await _db.Supporters.CountAsync(s => s.Status == "Active");
        var totalDonations = await _db.Donations.SumAsync(d => d.Amount ?? 0);
        var totalIncidents = await _db.IncidentReports.CountAsync(i => !i.Resolved);

        var summary = new List<DashboardMetric>
        {
            new("Active Residents", totalResidents.ToString()),
            new("Active Supporters", totalSupporters.ToString()),
            new("Total Donations (PHP)", totalDonations.ToString("N0")),
            new("Open Incidents", totalIncidents.ToString())
        };

        var monthlyMetrics = await _db.SafehouseMonthlyMetrics
            .OrderByDescending(m => m.MonthStart)
            .Take(12)
            .Select(m => (object)new { m.MetricId, m.SafehouseId, m.MonthStart, m.ActiveResidents, m.AvgHealthScore, m.AvgEducationProgress, m.IncidentCount })
            .ToListAsync();

        var safehouseBreakdown = await _db.Safehouses
            .Select(s => (object)new { s.SafehouseId, s.Name, s.Region, s.CurrentOccupancy, s.CapacityGirls, s.Status })
            .ToListAsync();

        return new AdminDashboardData(summary, monthlyMetrics, safehouseBreakdown);
    }

    public async Task<IReadOnlyList<object>> GetPublicSnapshotsAsync(int count = 6)
    {
        return await _db.PublicImpactSnapshots
            .Where(s => s.IsPublished)
            .OrderByDescending(s => s.SnapshotDate)
            .Take(count)
            .Select(s => (object)new { s.SnapshotId, s.SnapshotDate, s.Headline, s.SummaryText, s.MetricPayloadJson })
            .ToListAsync();
    }
}
