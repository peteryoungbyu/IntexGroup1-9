using Intex.API.Data;
using Intex.API.Models;
using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class SupporterService : ISupporterService
{
    private readonly AppDbContext _db;

    public SupporterService(AppDbContext db) => _db = db;

    public async Task<PagedResult<SupporterListItem>> GetAllAsync(int page, int pageSize, string? search, string? status)
    {
        var query = _db.Supporters.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.DisplayName.Contains(search) || (s.Email != null && s.Email.Contains(search)));

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SupporterListItem(
                s.SupporterId,
                s.DisplayName,
                s.SupporterType,
                s.Status,
                s.Donations.Where(d => d.Amount != null).Sum(d => d.Amount!.Value),
                s.FirstDonationDate))
            .ToListAsync();

        return new PagedResult<SupporterListItem>(items, total, page, pageSize);
    }

    public async Task<IReadOnlyList<SupporterChurnItem>> GetChurnPredictionsAsync()
    {
        var items = new List<SupporterChurnItem>();

        await using var connection = _db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT
    supporter_id,
    display_name,
    churn_probability,
    likely_churn
FROM supporters
ORDER BY
    COALESCE(churn_probability, 0) DESC,
    display_name ASC";

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var supporterId = reader.GetInt32(0);
            var displayName = reader.IsDBNull(1) ? "Unknown" : reader.GetString(1);
            decimal? churnProbability = reader.IsDBNull(2)
                ? null
                : Convert.ToDecimal(reader.GetValue(2));

            bool? likelyChurn = null;
            if (!reader.IsDBNull(3))
            {
                var raw = reader.GetValue(3);
                likelyChurn = raw switch
                {
                    bool b => b,
                    byte by => by != 0,
                    short s => s != 0,
                    int i => i != 0,
                    long l => l != 0,
                    _ => Convert.ToBoolean(raw),
                };
            }

            items.Add(new SupporterChurnItem(supporterId, displayName, churnProbability, likelyChurn));
        }

        return items;
    }

    public async Task<SupporterDetail?> GetByIdAsync(int id)
    {
        var supporter = await _db.Supporters
            .Include(s => s.Donations)
                .ThenInclude(d => d.Items)
            .Include(s => s.Donations)
                .ThenInclude(d => d.Allocations)
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        if (supporter is null) return null;
        var inKindItems = supporter.Donations.SelectMany(d => d.Items).ToList();
        var allocations = supporter.Donations.SelectMany(d => d.Allocations).ToList();
        return new SupporterDetail(supporter, supporter.Donations.ToList(), inKindItems, allocations);
    }

    public async Task<SupporterDetail?> GetByUserIdAsync(string userId)
    {
        var link = await _db.SupporterUserLinks
            .Include(l => l.Supporter)
                .ThenInclude(s => s.Donations)
                    .ThenInclude(d => d.Items)
            .Include(l => l.Supporter)
                .ThenInclude(s => s.Donations)
                    .ThenInclude(d => d.Allocations)
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (link is null) return null;
        var inKindItems = link.Supporter.Donations.SelectMany(d => d.Items).ToList();
        var allocations = link.Supporter.Donations.SelectMany(d => d.Allocations).ToList();
        return new SupporterDetail(link.Supporter, link.Supporter.Donations.ToList(), inKindItems, allocations);
    }

    public async Task<Supporter> CreateAsync(Supporter supporter)
    {
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();
        return supporter;
    }

    public async Task<Supporter?> UpdateAsync(int id, Supporter updated)
    {
        var existing = await _db.Supporters.FindAsync(id);
        if (existing is null) return null;

        existing.DisplayName = updated.DisplayName;
        existing.SupporterType = updated.SupporterType;
        existing.OrganizationName = updated.OrganizationName;
        existing.FirstName = updated.FirstName;
        existing.LastName = updated.LastName;
        existing.Email = updated.Email;
        existing.Phone = updated.Phone;
        existing.Status = updated.Status;
        existing.Region = updated.Region;
        existing.Country = updated.Country;
        existing.AcquisitionChannel = updated.AcquisitionChannel;

        await _db.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var supporter = await _db.Supporters.FindAsync(id);
        if (supporter is null) return false;
        _db.Supporters.Remove(supporter);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<Donation> AddDonationAsync(int supporterId, Donation donation)
    {
        donation.SupporterId = supporterId;
        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return donation;
    }

    public async Task<bool> DeleteDonationAsync(int supporterId, int donationId)
    {
        var donation = await _db.Donations
            .FirstOrDefaultAsync(d => d.DonationId == donationId && d.SupporterId == supporterId);
        if (donation is null) return false;
        _db.Donations.Remove(donation);
        await _db.SaveChangesAsync();
        return true;
    }
}
