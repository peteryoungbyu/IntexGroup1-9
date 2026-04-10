using Intex.API.Data;
using Intex.API.Models;
using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class SupporterService : ISupporterService
{
    private static readonly string[] DefaultSupporterTypes =
    [
        "MonetaryDonor",
        "InKindDonor",
        "Volunteer",
        "SkillsContributor",
        "SocialMediaAdvocate",
        "PartnerOrganization",
    ];

    private static readonly string[] DefaultRelationshipTypes =
    [
        "Local",
        "International",
        "PartnerOrganization",
    ];

    private static readonly string[] DefaultAcquisitionChannels =
    [
        "Website",
        "SocialMedia",
        "Event",
        "WordOfMouth",
        "PartnerReferral",
        "Church",
    ];

    private static readonly string[] DefaultStatuses =
    [
        "Active",
        "Inactive",
    ];

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
                s.DisplayName != null && s.DisplayName.Trim() != string.Empty
                    ? s.DisplayName
                    : (s.Email ?? "Unknown"),
                s.SupporterType,
                s.Status,
                s.Donations.Where(d => d.Amount != null).Sum(d => d.Amount!.Value),
                s.FirstDonationDate))
            .ToListAsync();

        return new PagedResult<SupporterListItem>(items, total, page, pageSize);
    }

    public async Task<SupporterFormOptions> GetFormOptionsAsync()
    {
        var supporterTypes = await GetDistinctOrderedValuesAsync(
            _db.Supporters.Select(s => s.SupporterType),
            DefaultSupporterTypes);

        var relationshipTypes = await GetDistinctOrderedValuesAsync(
            _db.Supporters.Select(s => s.RelationshipType),
            DefaultRelationshipTypes);

        var regions = await GetDistinctOrderedValuesAsync(
            _db.Supporters.Select(s => s.Region),
            []);

        var countries = await GetDistinctOrderedValuesAsync(
            _db.Supporters.Select(s => s.Country),
            []);

        var acquisitionChannels = await GetDistinctOrderedValuesAsync(
            _db.Supporters.Select(s => s.AcquisitionChannel),
            DefaultAcquisitionChannels);

        return new SupporterFormOptions(
            supporterTypes,
            relationshipTypes,
            regions,
            countries,
            acquisitionChannels,
            DefaultStatuses);
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

        var firstName = updated.FirstName?.Trim();
        var lastName = updated.LastName?.Trim();

        existing.DisplayName = $"{firstName} {lastName}".Trim();
        existing.SupporterType = updated.SupporterType.Trim();
        existing.OrganizationName = string.IsNullOrWhiteSpace(updated.OrganizationName) ? null : updated.OrganizationName.Trim();
        existing.FirstName = string.IsNullOrWhiteSpace(firstName) ? null : firstName;
        existing.LastName = string.IsNullOrWhiteSpace(lastName) ? null : lastName;
        existing.RelationshipType = string.IsNullOrWhiteSpace(updated.RelationshipType) ? null : updated.RelationshipType.Trim();
        existing.Email = string.IsNullOrWhiteSpace(updated.Email) ? null : updated.Email.Trim();
        existing.Phone = string.IsNullOrWhiteSpace(updated.Phone) ? null : updated.Phone.Trim();
        existing.Status = updated.Status.Trim();
        existing.Region = string.IsNullOrWhiteSpace(updated.Region) ? null : updated.Region.Trim();
        existing.Country = string.IsNullOrWhiteSpace(updated.Country) ? null : updated.Country.Trim();
        existing.AcquisitionChannel = string.IsNullOrWhiteSpace(updated.AcquisitionChannel) ? null : updated.AcquisitionChannel.Trim();
        existing.FirstDonationDate = updated.FirstDonationDate;

        await _db.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var supporter = await _db.Supporters.FindAsync(id);
        if (supporter is null) return false;

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var donations = await _db.Donations
            .Where(d => d.SupporterId == id)
            .Select(d => d.DonationId)
            .ToListAsync();

        if (donations.Count > 0)
        {
            var allocationRows = await _db.DonationAllocations
                .Where(a => donations.Contains(a.DonationId))
                .ToListAsync();

            if (allocationRows.Count > 0)
                _db.DonationAllocations.RemoveRange(allocationRows);

            var itemRows = await _db.InKindDonationItems
                .Where(i => donations.Contains(i.DonationId))
                .ToListAsync();

            if (itemRows.Count > 0)
                _db.InKindDonationItems.RemoveRange(itemRows);

            var donationRows = await _db.Donations
                .Where(d => d.SupporterId == id)
                .ToListAsync();

            _db.Donations.RemoveRange(donationRows);
        }

        var userLinks = await _db.SupporterUserLinks
            .Where(link => link.SupporterId == id)
            .ToListAsync();

        if (userLinks.Count > 0)
            _db.SupporterUserLinks.RemoveRange(userLinks);

        var predictions = await _db.PredictionResults
            .Where(result => result.SupporterId == id)
            .ToListAsync();

        if (predictions.Count > 0)
            _db.PredictionResults.RemoveRange(predictions);

        _db.Supporters.Remove(supporter);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return true;
    }

    public async Task<Donation> AddDonationAsync(int supporterId, CreateSupporterDonationRequest request)
    {
        var supporter = await _db.Supporters.FindAsync(supporterId)
            ?? throw new InvalidOperationException($"Supporter {supporterId} was not found.");

        var pledgeOptions = await GetDonorPledgeOptionsAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var selectedProgram = !string.IsNullOrWhiteSpace(request.ProgramArea)
            && !string.Equals(request.ProgramArea, "Any", StringComparison.OrdinalIgnoreCase)
            && pledgeOptions.ProgramAreas.Contains(request.ProgramArea)
                ? request.ProgramArea
                : pledgeOptions.ProgramAreas[Random.Shared.Next(pledgeOptions.ProgramAreas.Count)];

        var selectedSafehouse = request.SafehouseId.HasValue
            && pledgeOptions.SafehouseIds.Contains(request.SafehouseId.Value)
                ? request.SafehouseId.Value
                : pledgeOptions.SafehouseIds[Random.Shared.Next(pledgeOptions.SafehouseIds.Count)];

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var donation = new Donation
        {
            DonationId = await GetNextDonationIdAsync(),
            SupporterId = supporterId,
            DonationType = "Monetary",
            DonationDate = today,
            IsRecurring = request.IsRecurring,
            CampaignName = null,
            ChannelSource = "Direct",
            CurrencyCode = "PHP",
            Amount = request.Amount,
            EstimatedValue = request.Amount,
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
            AmountAllocated = request.Amount,
            AllocationDate = today,
            AllocationNotes = null,
        };

        _db.DonationAllocations.Add(allocation);

        if (!supporter.FirstDonationDate.HasValue)
            supporter.FirstDonationDate = today;

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
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

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var allocationRows = await _db.DonationAllocations
            .Where(a => a.DonationId == donationId)
            .ToListAsync();

        if (allocationRows.Count > 0)
            _db.DonationAllocations.RemoveRange(allocationRows);

        var itemRows = await _db.InKindDonationItems
            .Where(i => i.DonationId == donationId)
            .ToListAsync();

        if (itemRows.Count > 0)
            _db.InKindDonationItems.RemoveRange(itemRows);

        _db.Donations.Remove(donation);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
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

    private static async Task<IReadOnlyList<string>> GetDistinctOrderedValuesAsync(
        IQueryable<string?> query,
        IReadOnlyCollection<string> fallbacks)
    {
        var values = await query
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!.Trim())
            .Distinct()
            .OrderBy(value => value)
            .ToListAsync();

        if (values.Count > 0)
            return values;

        return fallbacks
            .Distinct(StringComparer.Ordinal)
            .OrderBy(value => value)
            .ToList();
    }
}
