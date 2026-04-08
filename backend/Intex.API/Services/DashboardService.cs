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
            .Select(m => (object)new
            {
                m.MetricId,
                m.SafehouseId,
                m.MonthStart,
                m.ActiveResidents,
                AvgHealthScore = m.AvgHealthScore ?? 0m,
                AvgEducationProgress = m.AvgEducationProgress ?? 0m,
                m.IncidentCount
            })
            .ToListAsync();

        var safehouseBreakdown = await _db.Safehouses
            .Select(s => (object)new
            {
                s.SafehouseId,
                s.Name,
                s.Region,
                CurrentOccupancy = s.Residents.Count(r => r.CaseStatus == "Active"),
                s.CapacityGirls,
                s.Status
            })
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var upcomingConferences = await _db.CaseConferences
            .Where(c => c.ConferenceDate >= today)
            .OrderBy(c => c.ConferenceDate)
            .Take(10)
            .Select(c => (object)new
            {
                c.ConferenceId,
                c.ResidentId,
                c.ConferenceDate,
                c.FacilitatedBy,
                c.Attendees,
                c.Agenda,
                c.NextReviewDate
            })
            .ToListAsync();

        return new AdminDashboardData(summary, monthlyMetrics, safehouseBreakdown, upcomingConferences);
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

    public async Task<object?> GetPublicSnapshotByDateAsync(DateOnly snapshotDate)
    {
        return await _db.PublicImpactSnapshots
            .Where(s => s.IsPublished && s.SnapshotDate == snapshotDate)
            .Select(s => (object)new { s.SnapshotId, s.SnapshotDate, s.Headline, s.SummaryText, s.MetricPayloadJson })
            .FirstOrDefaultAsync();
    }

    public async Task<PublicOrgSummary> GetPublicOrgSummaryAsync()
    {
        var totalGirls = await _db.Residents.CountAsync();
        var safehouses = await _db.Safehouses.CountAsync();
        var staffAndVolunteers = await _db.Partners.CountAsync(p => p.Status == "Active");

        var earliestOpen = await _db.Safehouses
            .MinAsync(s => (DateOnly?)s.OpenDate);
        var yearsOperating = earliestOpen.HasValue
            ? DateTime.UtcNow.Year - earliestOpen.Value.Year
            : 0;

        return new PublicOrgSummary(totalGirls, safehouses, yearsOperating, staffAndVolunteers);
    }
}
