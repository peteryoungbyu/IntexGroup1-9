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

    public async Task<Resident?> UpdateAsync(int id, UpdateResidentRequest updated)
    {
        var existing = await _db.Residents.FindAsync(id);
        if (existing is null) return null;

        ValidateRequiredDate(updated.DateOfBirth, nameof(updated.DateOfBirth));
        ValidateRequiredDate(updated.DateOfAdmission, nameof(updated.DateOfAdmission));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        ValidateResidentTimeline(updated.DateOfBirth, updated.DateOfAdmission, today, updated.DateClosed);

        if (!ResidentOptionCatalog.SafehouseIds.Contains(updated.SafehouseId))
            throw new ValidationException("SafehouseId must be between 1 and 9.");

        if (!await _db.Safehouses.AsNoTracking().AnyAsync(safehouse => safehouse.SafehouseId == updated.SafehouseId))
            throw new ValidationException("The selected safehouse does not exist.");

        var caseStatus = NormalizeRequiredOption(updated.CaseStatus, ResidentOptionCatalog.CaseStatuses, nameof(updated.CaseStatus));
        var birthStatus = NormalizeRequiredOption(updated.BirthStatus, ResidentOptionCatalog.BirthStatuses, nameof(updated.BirthStatus));
        var caseCategory = NormalizeRequiredOption(updated.CaseCategory, ResidentOptionCatalog.CaseCategories, nameof(updated.CaseCategory));
        var referralSource = NormalizeRequiredOption(updated.ReferralSource, ResidentOptionCatalog.ReferralSources, nameof(updated.ReferralSource));
        var initialRiskLevel = NormalizeRequiredOption(updated.InitialRiskLevel, ResidentOptionCatalog.RiskLevels, nameof(updated.InitialRiskLevel));
        var currentRiskLevel = NormalizeRequiredOption(updated.CurrentRiskLevel, ResidentOptionCatalog.RiskLevels, nameof(updated.CurrentRiskLevel));
        var reintegrationType = NormalizeOptionalOption(updated.ReintegrationType, ResidentOptionCatalog.ReintegrationTypes, nameof(updated.ReintegrationType));
        var reintegrationStatus = NormalizeOptionalOption(updated.ReintegrationStatus, ResidentOptionCatalog.ReintegrationStatuses, nameof(updated.ReintegrationStatus));

        var sex = NormalizeRequiredText(updated.Sex, nameof(updated.Sex)).ToUpperInvariant();
        if (sex.Length != 1)
            throw new ValidationException("Sex must be a single character.");

        var placeOfBirth = NormalizeRequiredText(updated.PlaceOfBirth, nameof(updated.PlaceOfBirth));
        var religion = NormalizeRequiredText(updated.Religion, nameof(updated.Religion));
        var assignedSocialWorker = NormalizeRequiredText(updated.AssignedSocialWorker, nameof(updated.AssignedSocialWorker));
        var initialCaseAssessment = NormalizeRequiredText(updated.InitialCaseAssessment, nameof(updated.InitialCaseAssessment));
        var referringAgencyPerson = NormalizeOptionalText(updated.ReferringAgencyPerson);
        var pwdType = updated.IsPwd ? NormalizeOptionalText(updated.PwdType) : null;
        var specialNeedsDiagnosis = updated.HasSpecialNeeds ? NormalizeOptionalText(updated.SpecialNeedsDiagnosis) : null;
        existing.SafehouseId = updated.SafehouseId;
        existing.CaseStatus = caseStatus;
        existing.Sex = sex;
        existing.DateOfBirth = updated.DateOfBirth;
        existing.BirthStatus = birthStatus;
        existing.PlaceOfBirth = placeOfBirth;
        existing.Religion = religion;
        existing.CaseCategory = caseCategory;
        existing.SubCatOrphaned = updated.SubCatOrphaned;
        existing.SubCatTrafficked = updated.SubCatTrafficked;
        existing.SubCatChildLabor = updated.SubCatChildLabor;
        existing.SubCatPhysicalAbuse = updated.SubCatPhysicalAbuse;
        existing.SubCatSexualAbuse = updated.SubCatSexualAbuse;
        existing.SubCatOsaec = updated.SubCatOsaec;
        existing.SubCatCicl = updated.SubCatCicl;
        existing.SubCatAtRisk = updated.SubCatAtRisk;
        existing.SubCatStreetChild = updated.SubCatStreetChild;
        existing.SubCatChildWithHiv = updated.SubCatChildWithHiv;
        existing.IsPwd = updated.IsPwd;
        existing.PwdType = pwdType;
        existing.HasSpecialNeeds = updated.HasSpecialNeeds;
        existing.SpecialNeedsDiagnosis = specialNeedsDiagnosis;
        existing.FamilyIs4Ps = updated.FamilyIs4Ps;
        existing.FamilySoloParent = updated.FamilySoloParent;
        existing.FamilyIndigenous = updated.FamilyIndigenous;
        existing.FamilyParentPwd = updated.FamilyParentPwd;
        existing.FamilyInformalSettler = updated.FamilyInformalSettler;
        existing.DateOfAdmission = updated.DateOfAdmission;
        existing.AgeUponAdmission = FormatDateSpan(updated.DateOfBirth, updated.DateOfAdmission, nameof(updated.DateOfAdmission));
        existing.PresentAge = FormatDateSpan(updated.DateOfBirth, today, nameof(updated.DateOfBirth));
        existing.LengthOfStay = FormatDateSpan(updated.DateOfAdmission, today, nameof(updated.DateOfAdmission));
        existing.ReferralSource = referralSource;
        existing.ReferringAgencyPerson = referringAgencyPerson;
        existing.AssignedSocialWorker = assignedSocialWorker;
        existing.InitialCaseAssessment = initialCaseAssessment;
        existing.ReintegrationType = reintegrationType;
        existing.ReintegrationStatus = reintegrationStatus;
        existing.InitialRiskLevel = initialRiskLevel;
        existing.CurrentRiskLevel = currentRiskLevel;
        existing.DateEnrolled = updated.DateOfAdmission;
        existing.DateClosed = updated.DateClosed;

        await _db.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return false;

        await using var transaction = await _db.Database.BeginTransactionAsync();

        await _db.CaseConferences
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.EducationRecords
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.HealthWellbeingRecords
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.HomeVisitations
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.IncidentReports
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.InterventionPlans
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.PredictionResults
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        await _db.ProcessRecordings
            .Where(record => record.ResidentId == id)
            .ExecuteDeleteAsync();

        var deletedResidents = await _db.Residents
            .Where(resident => resident.ResidentId == id)
            .ExecuteDeleteAsync();

        await transaction.CommitAsync();
        return deletedResidents > 0;
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

    private static void ValidateResidentTimeline(DateOnly dateOfBirth, DateOnly dateOfAdmission, DateOnly today, DateOnly? dateClosed = null)
    {
        if (dateOfBirth > today)
            throw new ValidationException("DateOfBirth cannot be in the future.");

        if (dateOfAdmission > today)
            throw new ValidationException("DateOfAdmission cannot be in the future.");

        if (dateOfAdmission < dateOfBirth)
            throw new ValidationException("DateOfAdmission cannot be earlier than DateOfBirth.");

        if (dateClosed is null)
            return;

        if (dateClosed.Value > today)
            throw new ValidationException("DateClosed cannot be in the future.");

        if (dateClosed.Value < dateOfAdmission)
            throw new ValidationException("DateClosed cannot be earlier than DateOfAdmission.");
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
