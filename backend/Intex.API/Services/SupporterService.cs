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

    public async Task<SupporterDetail?> GetByUserAsync(string userId, string? email)
    {
        var link = await _db.SupporterUserLinks
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (link is not null)
            return await GetByIdAsync(link.SupporterId);

        if (string.IsNullOrWhiteSpace(email))
            return null;

        var supporter = await _db.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter is null)
            return null;

        await EnsureUserLinkAsync(userId, supporter.SupporterId);
        return await GetByIdAsync(supporter.SupporterId);
    }

    public async Task<Supporter> CreateAsync(Supporter supporter)
    {
        if (supporter.SupporterId <= 0)
            supporter.SupporterId = await GetNextSupporterIdAsync();

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
        if (donation.DonationId <= 0)
            donation.DonationId = await GetNextDonationIdAsync();

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return donation;
    }

    public async Task<DonorPledgeOptions> GetDonorPledgeOptionsAsync()
    {
        var programAreas = await _db.DonationAllocations
            .Select(a => a.ProgramArea)
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .Distinct()
            .OrderBy(a => a)
            .ToListAsync();

        if (programAreas.Count == 0)
        {
            programAreas = new List<string>
            {
                "Education",
                "Maintenance",
                "Operations",
                "Outreach",
                "Transport",
                "Wellbeing",
            };
        }

        var safehouseIds = await _db.Safehouses
            .Select(s => s.SafehouseId)
            .OrderBy(id => id)
            .ToListAsync();

        if (safehouseIds.Count == 0)
            safehouseIds = Enumerable.Range(1, 9).ToList();

        return new DonorPledgeOptions(programAreas, safehouseIds);
    }

    public async Task<Donation> CreateDonorPledgeAsync(
        string userId,
        string email,
        decimal amount,
        bool isRecurring,
        string? selectedProgramArea,
        int? selectedSafehouseId)
    {
        var normalizedEmail = email.Trim();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var pledgeOptions = await GetDonorPledgeOptionsAsync();

        var selectedProgram = !string.IsNullOrWhiteSpace(selectedProgramArea)
            && !string.Equals(selectedProgramArea, "Any", StringComparison.OrdinalIgnoreCase)
            && pledgeOptions.ProgramAreas.Contains(selectedProgramArea)
                ? selectedProgramArea
                : pledgeOptions.ProgramAreas[Random.Shared.Next(pledgeOptions.ProgramAreas.Count)];

        var selectedSafehouse = selectedSafehouseId.HasValue
            && pledgeOptions.SafehouseIds.Contains(selectedSafehouseId.Value)
                ? selectedSafehouseId.Value
                : pledgeOptions.SafehouseIds[Random.Shared.Next(pledgeOptions.SafehouseIds.Count)];

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var supporter = await _db.Supporters
            .FirstOrDefaultAsync(s => s.Email == normalizedEmail);

        if (supporter is null)
        {
            supporter = new Supporter
            {
                SupporterId = await GetNextSupporterIdAsync(),
                SupporterType = "MonetaryDonor",
                DisplayName = normalizedEmail,
                OrganizationName = null,
                FirstName = null,
                LastName = null,
                RelationshipType = "Local",
                Region = "Unknown",
                Country = "Philippines",
                Email = normalizedEmail,
                Phone = "N/A",
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                FirstDonationDate = today,
                AcquisitionChannel = "Website",
                LikelyChurn = false,
                ChurnProbability = 0,
            };

            _db.Supporters.Add(supporter);
            await _db.SaveChangesAsync();
        }

        await EnsureUserLinkAsync(userId, supporter.SupporterId);

        var donation = new Donation
        {
            DonationId = await GetNextDonationIdAsync(),
            SupporterId = supporter.SupporterId,
            DonationType = "Monetary",
            DonationDate = today,
            IsRecurring = isRecurring,
            CampaignName = null,
            ChannelSource = "Direct",
            CurrencyCode = "PHP",
            Amount = amount,
            EstimatedValue = amount,
            ImpactUnit = "pesos",
            Notes = null,
            CreatedByPartnerId = null,
            ReferralPostId = null,
        };

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();

        var allocation = new DonationAllocation
        {
            AllocationId = await GetNextAllocationIdAsync(),
            DonationId = donation.DonationId,
            SafehouseId = selectedSafehouse,
            ProgramArea = selectedProgram,
            AmountAllocated = amount,
            AllocationDate = today,
            AllocationNotes = null,
        };

        _db.DonationAllocations.Add(allocation);
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();
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

    private async Task EnsureUserLinkAsync(string userId, int supporterId)
    {
        var existingUserLink = await _db.SupporterUserLinks
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (existingUserLink is null)
        {
            _db.SupporterUserLinks.Add(new SupporterUserLink
            {
                SupporterId = supporterId,
                UserId = userId,
            });

            await _db.SaveChangesAsync();
            return;
        }

        if (existingUserLink.SupporterId != supporterId)
        {
            existingUserLink.SupporterId = supporterId;
            await _db.SaveChangesAsync();
        }
    }

    private async Task<int> GetNextSupporterIdAsync()
    {
        var maxId = await _db.Supporters.MaxAsync(s => (int?)s.SupporterId) ?? 0;
        return maxId + 1;
    }

    private async Task<int> GetNextDonationIdAsync()
    {
        var maxId = await _db.Donations.MaxAsync(d => (int?)d.DonationId) ?? 0;
        return maxId + 1;
    }

    private async Task<int> GetNextAllocationIdAsync()
    {
        var maxId = await _db.DonationAllocations.MaxAsync(a => (int?)a.AllocationId) ?? 0;
        return maxId + 1;
    }
}
