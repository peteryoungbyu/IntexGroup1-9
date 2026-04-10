using Intex.API.Data;
using Intex.API.Models;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Linq.Expressions;
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

    public async Task<ResidentFormOptions> GetFormOptionsAsync()
    {
        var (_, nextCaseControlNo, nextInternalCode) = await GetNextResidentIdentityDataAsync();

        var religions = await GetDistinctResidentValuesAsync(resident => resident.Religion);
        var assignedSocialWorkers = await GetDistinctResidentValuesAsync(resident => resident.AssignedSocialWorker);
        var initialCaseAssessments = await GetDistinctResidentValuesAsync(resident => resident.InitialCaseAssessment);

        return new ResidentFormOptions(
            nextCaseControlNo,
            nextInternalCode,
            ResidentOptionCatalog.Safehouses,
            ResidentOptionCatalog.CaseStatuses,
            ResidentOptionCatalog.BirthStatuses,
            ResidentOptionCatalog.CaseCategories,
            ResidentOptionCatalog.ReferralSources,
            ResidentOptionCatalog.ReintegrationTypes,
            ResidentOptionCatalog.ReintegrationStatuses,
            ResidentOptionCatalog.RiskLevels,
            religions,
            assignedSocialWorkers,
            initialCaseAssessments);
    }

    public async Task<Resident> CreateAsync(CreateResidentRequest request)
    {
        ValidateRequiredDate(request.DateOfBirth, nameof(request.DateOfBirth));
        ValidateRequiredDate(request.DateOfAdmission, nameof(request.DateOfAdmission));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (request.DateOfBirth > today)
            throw new ValidationException("DateOfBirth cannot be in the future.");

        if (request.DateOfAdmission > today)
            throw new ValidationException("DateOfAdmission cannot be in the future.");

        if (request.DateOfAdmission < request.DateOfBirth)
            throw new ValidationException("DateOfAdmission cannot be earlier than DateOfBirth.");

        if (!ResidentOptionCatalog.SafehouseIds.Contains(request.SafehouseId))
            throw new ValidationException("SafehouseId must be between 1 and 9.");

        if (!await _db.Safehouses.AsNoTracking().AnyAsync(safehouse => safehouse.SafehouseId == request.SafehouseId))
            throw new ValidationException("The selected safehouse does not exist.");

        var caseStatus = NormalizeRequiredOption(request.CaseStatus, ResidentOptionCatalog.CaseStatuses, nameof(request.CaseStatus));
        var birthStatus = NormalizeRequiredOption(request.BirthStatus, ResidentOptionCatalog.BirthStatuses, nameof(request.BirthStatus));
        var caseCategory = NormalizeRequiredOption(request.CaseCategory, ResidentOptionCatalog.CaseCategories, nameof(request.CaseCategory));
        var referralSource = NormalizeRequiredOption(request.ReferralSource, ResidentOptionCatalog.ReferralSources, nameof(request.ReferralSource));
        var initialRiskLevel = NormalizeRequiredOption(request.InitialRiskLevel, ResidentOptionCatalog.RiskLevels, nameof(request.InitialRiskLevel));
        var currentRiskLevel = NormalizeRequiredOption(request.CurrentRiskLevel, ResidentOptionCatalog.RiskLevels, nameof(request.CurrentRiskLevel));

        var reintegrationType = NormalizeOptionalOption(request.ReintegrationType, ResidentOptionCatalog.ReintegrationTypes, nameof(request.ReintegrationType));
        var reintegrationStatus = NormalizeOptionalOption(request.ReintegrationStatus, ResidentOptionCatalog.ReintegrationStatuses, nameof(request.ReintegrationStatus));

        var placeOfBirth = NormalizeRequiredText(request.PlaceOfBirth, nameof(request.PlaceOfBirth));
        var religion = NormalizeRequiredText(request.Religion, nameof(request.Religion));
        var assignedSocialWorker = NormalizeRequiredText(request.AssignedSocialWorker, nameof(request.AssignedSocialWorker));
        var initialCaseAssessment = NormalizeRequiredText(request.InitialCaseAssessment, nameof(request.InitialCaseAssessment));
        var referringAgencyPerson = NormalizeOptionalText(request.ReferringAgencyPerson);
        var pwdType = request.IsPwd ? NormalizeOptionalText(request.PwdType) : null;
        var specialNeedsDiagnosis = request.HasSpecialNeeds ? NormalizeOptionalText(request.SpecialNeedsDiagnosis) : null;

        var (nextResidentId, nextCaseControlNo, nextInternalCode) = await GetNextResidentIdentityDataAsync();

        var resident = new Resident
        {
            ResidentId = nextResidentId,
            CaseControlNo = nextCaseControlNo,
            InternalCode = nextInternalCode,
            SafehouseId = request.SafehouseId,
            CaseStatus = caseStatus,
            Sex = "F",
            DateOfBirth = request.DateOfBirth,
            BirthStatus = birthStatus,
            PlaceOfBirth = placeOfBirth,
            Religion = religion,
            CaseCategory = caseCategory,
            SubCatOrphaned = request.SubCatOrphaned,
            SubCatTrafficked = request.SubCatTrafficked,
            SubCatChildLabor = request.SubCatChildLabor,
            SubCatPhysicalAbuse = request.SubCatPhysicalAbuse,
            SubCatSexualAbuse = request.SubCatSexualAbuse,
            SubCatOsaec = request.SubCatOsaec,
            SubCatCicl = request.SubCatCicl,
            SubCatAtRisk = request.SubCatAtRisk,
            SubCatStreetChild = request.SubCatStreetChild,
            SubCatChildWithHiv = request.SubCatChildWithHiv,
            IsPwd = request.IsPwd,
            PwdType = pwdType,
            HasSpecialNeeds = request.HasSpecialNeeds,
            SpecialNeedsDiagnosis = specialNeedsDiagnosis,
            FamilyIs4Ps = request.FamilyIs4Ps,
            FamilySoloParent = request.FamilySoloParent,
            FamilyIndigenous = request.FamilyIndigenous,
            FamilyParentPwd = request.FamilyParentPwd,
            FamilyInformalSettler = request.FamilyInformalSettler,
            DateOfAdmission = request.DateOfAdmission,
            AgeUponAdmission = FormatDateSpan(request.DateOfBirth, request.DateOfAdmission, nameof(request.DateOfAdmission)),
            PresentAge = FormatDateSpan(request.DateOfBirth, today, nameof(request.DateOfBirth)),
            LengthOfStay = FormatDateSpan(request.DateOfAdmission, today, nameof(request.DateOfAdmission)),
            ReferralSource = referralSource,
            ReferringAgencyPerson = referringAgencyPerson,
            DateColbRegistered = null,
            DateColbObtained = null,
            AssignedSocialWorker = assignedSocialWorker,
            InitialCaseAssessment = initialCaseAssessment,
            DateCaseStudyPrepared = null,
            ReintegrationType = reintegrationType,
            ReintegrationStatus = reintegrationStatus,
            InitialRiskLevel = initialRiskLevel,
            CurrentRiskLevel = currentRiskLevel,
            DateEnrolled = request.DateOfAdmission,
            DateClosed = null,
            CreatedAt = DateTime.UtcNow,
            NotesRestricted = null,
        };

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

    private async Task<IReadOnlyList<string>> GetDistinctResidentValuesAsync(Expression<Func<Resident, string?>> selector)
    {
        return await _db.Residents
            .AsNoTracking()
            .Select(selector)
            .Where(value => value != null)
            .Select(value => value!.Trim())
            .Where(value => value.Length > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToListAsync();
    }

    private async Task<(int ResidentId, string CaseControlNo, string InternalCode)> GetNextResidentIdentityDataAsync()
    {
        var identifiers = await _db.Residents
            .AsNoTracking()
            .Select(resident => new { resident.ResidentId, resident.CaseControlNo, resident.InternalCode })
            .ToListAsync();

        var nextResidentId = identifiers.Count == 0
            ? 1
            : identifiers.Max(identifier => identifier.ResidentId) + 1;
        var nextCaseControlNo = ParseNextNumber(identifiers.Select(identifier => identifier.CaseControlNo), "C");
        var nextInternalCode = ParseNextNumber(identifiers.Select(identifier => identifier.InternalCode), "LS-");

        return (nextResidentId, $"C{nextCaseControlNo}", $"LS-{nextInternalCode:0000}");
    }

    private static int ParseNextNumber(IEnumerable<string?> values, string prefix)
    {
        var max = 0;

        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value))
                continue;

            var trimmed = value.Trim();
            if (!trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                continue;

            var numericPart = trimmed[prefix.Length..];
            if (int.TryParse(numericPart, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
                max = Math.Max(max, parsed);
        }

        return max + 1;
    }

    private static void ValidateRequiredDate(DateOnly value, string fieldName)
    {
        if (value == default)
            throw new ValidationException($"{fieldName} is required.");
    }

    private static string NormalizeRequiredText(string? value, string fieldName)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new ValidationException($"{fieldName} is required.");

        return trimmed;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string NormalizeRequiredOption(string? value, IReadOnlyCollection<string> allowedOptions, string fieldName)
    {
        var normalized = NormalizeOptionalOption(value, allowedOptions, fieldName);
        if (normalized is null)
            throw new ValidationException($"{fieldName} is required.");

        return normalized;
    }

    private static string? NormalizeOptionalOption(string? value, IReadOnlyCollection<string> allowedOptions, string fieldName)
    {
        var trimmed = NormalizeOptionalText(value);
        if (trimmed is null)
            return null;

        var normalized = allowedOptions.FirstOrDefault(option =>
            string.Equals(option, trimmed, StringComparison.OrdinalIgnoreCase));

        if (normalized is null)
            throw new ValidationException($"{fieldName} has an invalid value.");

        return normalized;
    }

    private static string FormatDateSpan(DateOnly start, DateOnly end, string fieldName)
    {
        if (end < start)
            throw new ValidationException($"{fieldName} cannot be earlier than the reference date.");

        var totalMonths = ((end.Year - start.Year) * 12) + end.Month - start.Month;
        if (end.Day < start.Day)
            totalMonths--;

        if (totalMonths < 0)
            totalMonths = 0;

        var years = totalMonths / 12;
        var months = totalMonths % 12;

        return $"{years} Years {months} months";
    }
}
