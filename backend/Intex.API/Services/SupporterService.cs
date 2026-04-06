using Intex.API.Data;
using Intex.API.Models;
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

    public async Task<SupporterDetail?> GetByIdAsync(int id)
    {
        var supporter = await _db.Supporters
            .Include(s => s.Donations)
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        return supporter is null ? null : new SupporterDetail(supporter, supporter.Donations.ToList());
    }

    public async Task<SupporterDetail?> GetByUserIdAsync(string userId)
    {
        var link = await _db.SupporterUserLinks
            .Include(l => l.Supporter)
            .ThenInclude(s => s.Donations)
            .FirstOrDefaultAsync(l => l.UserId == userId);

        if (link is null) return null;
        return new SupporterDetail(link.Supporter, link.Supporter.Donations.ToList());
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
}
