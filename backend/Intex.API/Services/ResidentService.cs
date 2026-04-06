using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class ResidentService : IResidentService
{
    private readonly AppDbContext _db;

    public ResidentService(AppDbContext db) => _db = db;

    public async Task<PagedResult<ResidentListItem>> GetAllAsync(int page, int pageSize, string? search, string? status, int? safehouseId)
    {
        var query = _db.Residents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.CaseControlNo.Contains(search) || r.InternalCode.Contains(search));

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.CaseStatus == status);

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(r => r.DateOfAdmission)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ResidentListItem(r.ResidentId, r.CaseControlNo, r.InternalCode, r.CaseStatus, r.CaseCategory, r.CurrentRiskLevel, r.SafehouseId))
            .ToListAsync();

        return new PagedResult<ResidentListItem>(items, total, page, pageSize);
    }

    public async Task<ResidentDetail?> GetByIdAsync(int id)
    {
        var resident = await _db.Residents
            .Include(r => r.ProcessRecordings)
            .Include(r => r.HomeVisitations)
            .Include(r => r.InterventionPlans)
            .Include(r => r.CaseConferences)
            .Include(r => r.PredictionResults)
            .FirstOrDefaultAsync(r => r.ResidentId == id);

        if (resident is null) return null;

        return new ResidentDetail(
            resident,
            resident.ProcessRecordings.ToList(),
            resident.HomeVisitations.ToList(),
            resident.InterventionPlans.ToList(),
            resident.CaseConferences.ToList(),
            resident.PredictionResults.ToList());
    }

    public async Task<Resident> CreateAsync(Resident resident)
    {
        _db.Residents.Add(resident);
        await _db.SaveChangesAsync();
        return resident;
    }

    public async Task<Resident?> UpdateAsync(int id, Resident updated)
    {
        var existing = await _db.Residents.FindAsync(id);
        if (existing is null) return null;

        existing.CaseStatus = updated.CaseStatus;
        existing.CurrentRiskLevel = updated.CurrentRiskLevel;
        existing.ReintegrationStatus = updated.ReintegrationStatus;
        existing.ReintegrationType = updated.ReintegrationType;
        existing.AssignedSocialWorker = updated.AssignedSocialWorker;
        existing.NotesRestricted = updated.NotesRestricted;
        existing.DateClosed = updated.DateClosed;

        await _db.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var resident = await _db.Residents.FindAsync(id);
        if (resident is null) return false;
        _db.Residents.Remove(resident);
        await _db.SaveChangesAsync();
        return true;
    }
}
