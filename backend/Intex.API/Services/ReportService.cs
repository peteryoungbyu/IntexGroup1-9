using Intex.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ReportSection>> GetAnnualAccomplishmentAsync(int year)
    {
        var residents = await _db.Residents
            .Where(r => r.DateOfAdmission.Year == year || (r.DateClosed.HasValue && r.DateClosed.Value.Year == year))
            .CountAsync();

        var donations = await _db.Donations
            .Where(d => d.DonationDate.Year == year)
            .GroupBy(d => d.DonationType)
            .Select(g => new { Type = g.Key, Count = g.Count(), Total = g.Sum(d => d.Amount ?? 0) })
            .ToListAsync();

        var reintegrated = await _db.Residents
            .Where(r => r.ReintegrationStatus == "Completed" && r.DateClosed.HasValue && r.DateClosed.Value.Year == year)
            .CountAsync();

        return new List<ReportSection>
        {
            new("Beneficiaries Served", "Total residents admitted or served during the year", new { Year = year, ResidentsServed = residents, ReintegratedCount = reintegrated }),
            new("Donation Summary", "Breakdown of donations received by type", donations),
            new("Reintegration Outcomes", $"Residents successfully reintegrated in {year}", new { Count = reintegrated })
        };
    }

    public async Task<ReportSection> GetDonationTrendsAsync(int months = 12)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months));
        var data = await _db.Donations
            .Where(d => d.DonationDate >= cutoff)
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count(), Total = g.Sum(d => d.Amount ?? 0) })
            .OrderBy(g => g.Year).ThenBy(g => g.Month)
            .ToListAsync();

        return new ReportSection("Donation Trends", $"Monthly donation totals for the past {months} months", data);
    }

    public async Task<ReportSection> GetReintegrationOutcomesAsync()
    {
        var data = await _db.Residents
            .GroupBy(r => r.ReintegrationStatus ?? "Not Started")
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return new ReportSection("Reintegration Outcomes", "Breakdown of reintegration statuses across all residents", data);
    }

    public async Task<ReportSection> GetSafehouseComparisonAsync()
    {
        var data = await _db.SafehouseMonthlyMetrics
            .Include(m => m.Safehouse)
            .OrderByDescending(m => m.MonthStart)
            .Take(50)
            .Select(m => new { m.Safehouse.Name, m.MonthStart, m.ActiveResidents, m.AvgHealthScore, m.AvgEducationProgress, m.IncidentCount })
            .ToListAsync();

        return new ReportSection("Safehouse Comparison", "Monthly metrics across all safehouses", data);
    }
}
