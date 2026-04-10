using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class ResidentService : IResidentService
{
    private readonly AppDbContext _db;

    public ResidentService(AppDbContext db) => _db = db;

    public async Task<PagedResult<ResidentListItem>> GetAllAsync(int page, int pageSize, string? search, string? status, int? safehouseId, string? caseCategory)
    {
        var query = _db.Residents
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.CaseControlNo.Contains(search) || r.InternalCode.Contains(search));

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.CaseStatus == status);

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId.Value);

        if (!string.IsNullOrWhiteSpace(caseCategory))
            query = query.Where(r => r.CaseCategory == caseCategory);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(r => r.DateOfAdmission)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ResidentListItem(
                r.ResidentId,
                r.CaseControlNo,
                r.InternalCode,
                r.CaseStatus,
                r.CaseCategory,
                r.CurrentRiskLevel,
                r.SafehouseId,
                r.Safehouse.Name))
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

        var processRecordings = await _db.ProcessRecordings
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.ProcessRecordings.RemoveRange(processRecordings);

        var homeVisitations = await _db.HomeVisitations
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.HomeVisitations.RemoveRange(homeVisitations);

        var educationRecords = await _db.EducationRecords
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.EducationRecords.RemoveRange(educationRecords);

        var healthRecords = await _db.HealthWellbeingRecords
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.HealthWellbeingRecords.RemoveRange(healthRecords);

        var interventionPlans = await _db.InterventionPlans
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.InterventionPlans.RemoveRange(interventionPlans);

        var incidentReports = await _db.IncidentReports
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.IncidentReports.RemoveRange(incidentReports);

        var caseConferences = await _db.CaseConferences
            .Where(x => x.ResidentId == id).ToListAsync();
        _db.CaseConferences.RemoveRange(caseConferences);

        _db.Residents.Remove(resident);
        await _db.SaveChangesAsync();
        return true;
    }
}
