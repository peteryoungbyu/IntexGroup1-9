using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Intex.API.Services;

public class ReintegrationReadinessOptions
{
    public string ModelPath { get; set; } = "ml-runtime/reintegration_model.onnx";
    public float Threshold { get; set; } = 0.5f;
}

public class ReintegrationReadinessService : IReintegrationReadinessService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ReintegrationReadinessService> _logger;
    private readonly ReintegrationReadinessOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;

    // Exact ONNX input order from export script output
    private static readonly string[] NumericFeatures =
    [
        "sub_cat_orphaned", "sub_cat_trafficked", "sub_cat_child_labor", "sub_cat_physical_abuse",
        "sub_cat_sexual_abuse", "sub_cat_osaec", "sub_cat_cicl", "sub_cat_at_risk",
        "sub_cat_street_child", "sub_cat_child_with_hiv", "is_pwd", "has_special_needs",
        "family_is_4ps", "family_solo_parent", "family_indigenous", "family_parent_pwd",
        "family_informal_settler", "admission_age_years", "days_since_admission",
        "education_record_count", "edu_mean_attendance_rate", "edu_mean_progress_percent",
        "edu_max_attendance_rate", "edu_max_progress_percent", "edu_last_attendance_rate",
        "edu_last_progress_percent", "edu_completed_count",
        "health_mean_general_health_score", "health_mean_nutrition_score",
        "health_mean_sleep_quality_score", "health_mean_energy_level_score",
        "health_mean_height_cm", "health_mean_weight_kg", "health_mean_bmi",
        "health_last_general_health_score", "health_last_nutrition_score",
        "health_last_sleep_quality_score", "health_last_energy_level_score",
        "health_last_height_cm", "health_last_weight_kg", "health_last_bmi",
        "health_last_medical_checkup_done", "health_last_dental_checkup_done",
        "health_last_psychological_checkup_done",
        "incident_count", "high_severity_count", "unresolved_incident_count",
        "follow_up_required_count", "mean_incident_severity_score",
        "plan_count", "distinct_plan_categories", "mean_plan_target_value",
        "in_progress_plan_count", "completed_plan_count", "on_hold_plan_count",
        "visit_count", "safety_concerns_count", "follow_up_needed_count",
        "favorable_visit_count", "session_count", "mean_session_duration_minutes",
        "progress_noted_count", "concerns_flagged_count", "referral_made_count",
    ];

    // Exact ONNX categorical input order (interleaved with numerics in the feature list)
    private static readonly string[] CategoricalFeatures =
    [
        "sex", "birth_status", "place_of_birth", "religion", "case_category",
        "pwd_type", "special_needs_diagnosis", "referral_source", "assigned_social_worker",
        "initial_case_assessment", "reintegration_type", "initial_risk_level", "current_risk_level",
        "edu_last_level", "edu_last_school_name", "edu_last_enrollment_status", "edu_last_completion_status",
        "last_incident_type", "last_incident_severity", "last_incident_resolved",
        "last_incident_follow_up_required", "last_plan_category", "last_plan_status",
        "last_plan_services_provided", "last_visit_type", "last_location_visited",
        "last_family_cooperation_level", "last_visit_outcome", "last_session_type",
        "last_emotional_state_observed", "last_emotional_state_end", "last_interventions_applied",
    ];

    public ReintegrationReadinessService(
        IWebHostEnvironment environment,
        IOptions<ReintegrationReadinessOptions> options,
        ILogger<ReintegrationReadinessService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _environment = environment;
        _options = options.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<ReintegrationInferenceResult> RunAsync(CancellationToken cancellationToken = default)
    {
        var startedAt = DateTimeOffset.UtcNow;
        try
        {
            var modelPath = Path.IsPathRooted(_options.ModelPath)
                ? _options.ModelPath
                : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, _options.ModelPath));

            if (!File.Exists(modelPath))
                throw new FileNotFoundException($"ONNX model not found: {modelPath}");

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var anchor = DateOnly.FromDateTime(DateTime.UtcNow);

            var residents = await db.Residents.AsNoTracking().ToListAsync(cancellationToken);
            var processRecordings = await db.ProcessRecordings.AsNoTracking().ToListAsync(cancellationToken);
            var educationRecords = await db.EducationRecords.AsNoTracking().ToListAsync(cancellationToken);
            var healthRecords = await db.HealthWellbeingRecords.AsNoTracking().ToListAsync(cancellationToken);
            var incidentReports = await db.IncidentReports.AsNoTracking().ToListAsync(cancellationToken);
            var interventionPlans = await db.InterventionPlans.AsNoTracking().ToListAsync(cancellationToken);
            var homeVisitations = await db.HomeVisitations.AsNoTracking().ToListAsync(cancellationToken);

            var rows = BuildFeatureRows(residents, processRecordings, educationRecords, healthRecords,
                incidentReports, interventionPlans, homeVisitations, anchor);

            if (rows.Count == 0)
                return new ReintegrationInferenceResult(true, 0, startedAt, DateTimeOffset.UtcNow, "No residents found.", string.Empty);

            var predictions = RunOnnxInference(modelPath, rows);

            // Write to PredictionResults (upsert by replacing today's rows for this model)
            var existingToday = await db.PredictionResults
                .Where(p => p.ModelName == "reintegration_readiness" && p.GeneratedAt >= DateTime.UtcNow.Date)
                .ToListAsync(cancellationToken);
            db.PredictionResults.RemoveRange(existingToday);

            var newResults = predictions.Select(p => new PredictionResult
            {
                ResidentId = p.ResidentId,
                ModelName = "reintegration_readiness",
                Score = (decimal)Math.Round(p.Probability, 3),
                Label = p.Probability >= _options.Threshold ? "Ready" : "NotReady",
                GeneratedAt = DateTime.UtcNow,
            }).ToList();

            db.PredictionResults.AddRange(newResults);
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Reintegration inference complete. Updated: {Count}", newResults.Count);
            return new ReintegrationInferenceResult(true, newResults.Count, startedAt, DateTimeOffset.UtcNow,
                $"Wrote {newResults.Count} predictions.", string.Empty);
        }
        catch (TypeInitializationException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime type initialization failed during reintegration readiness inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new ReintegrationInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (DllNotFoundException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime native dependency load failed during reintegration readiness inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new ReintegrationInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (BadImageFormatException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime architecture mismatch or invalid native image during reintegration readiness inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new ReintegrationInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reintegration readiness inference failed.");
            return new ReintegrationInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, ex.Message);
        }
    }

    private List<ResidentFeatureRow> BuildFeatureRows(
        List<Resident> residents,
        List<ProcessRecording> recordings,
        List<EducationRecord> educationRecords,
        List<HealthWellbeingRecord> healthRecords,
        List<IncidentReport> incidents,
        List<InterventionPlan> plans,
        List<HomeVisitation> visitations,
        DateOnly anchor)
    {
        var recByResident = recordings.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var eduByResident = educationRecords.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.OrderBy(e => e.RecordDate).ToList());
        var healthByResident = healthRecords.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.OrderBy(h => h.RecordDate).ToList());
        var incByResident = incidents.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var plansByResident = plans.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var visitByResident = visitations.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());

        var rows = new List<ResidentFeatureRow>();

        foreach (var r in residents)
        {
            recByResident.TryGetValue(r.ResidentId, out var recs);
            eduByResident.TryGetValue(r.ResidentId, out var edus);
            healthByResident.TryGetValue(r.ResidentId, out var healths);
            incByResident.TryGetValue(r.ResidentId, out var incs);
            plansByResident.TryGetValue(r.ResidentId, out var resPlans);
            visitByResident.TryGetValue(r.ResidentId, out var visits);

            recs ??= [];
            edus ??= [];
            healths ??= [];
            incs ??= [];
            resPlans ??= [];
            visits ??= [];

            double admissionAgeYears = r.DateOfAdmission != default
                ? (r.DateOfAdmission.DayNumber - r.DateOfBirth.DayNumber) / 365.25
                : double.NaN;
            double daysSinceAdmission = r.DateOfAdmission != default
                ? (anchor.DayNumber - r.DateOfAdmission.DayNumber)
                : double.NaN;

            // Education aggregates
            int eduCount = edus.Count;
            double eduMeanAtt = edus.Count > 0 ? edus.Average(e => (double)e.AttendanceRate) : double.NaN;
            double eduMeanProg = edus.Count > 0 ? edus.Average(e => (double)e.ProgressPercent) : double.NaN;
            double eduMaxAtt = edus.Count > 0 ? (double)edus.Max(e => e.AttendanceRate) : double.NaN;
            double eduMaxProg = edus.Count > 0 ? (double)edus.Max(e => e.ProgressPercent) : double.NaN;
            var lastEdu = edus.LastOrDefault();
            double eduLastAtt = lastEdu != null ? (double)lastEdu.AttendanceRate : double.NaN;
            double eduLastProg = lastEdu != null ? (double)lastEdu.ProgressPercent : double.NaN;
            int eduCompletedCount = edus.Count(e => e.CompletionStatus == "Completed");

            // Health aggregates
            double healthMeanGeneral = healths.Count > 0 ? healths.Average(h => (double)(h.GeneralHealthScore ?? 0)) : double.NaN;
            double healthMeanNutrition = healths.Count > 0 ? healths.Average(h => (double)(h.NutritionScore ?? 0)) : double.NaN;
            double healthMeanSleep = healths.Count > 0 ? healths.Average(h => (double)(h.SleepScore ?? 0)) : double.NaN;
            double healthMeanEnergy = healths.Count > 0 ? healths.Average(h => (double)(h.EnergyScore ?? 0)) : double.NaN;
            double healthMeanHeight = healths.Count > 0 ? healths.Average(h => (double)(h.HeightCm ?? 0)) : double.NaN;
            double healthMeanWeight = healths.Count > 0 ? healths.Average(h => (double)(h.WeightKg ?? 0)) : double.NaN;
            double healthMeanBmi = healths.Count > 0 ? healths.Average(h => (double)(h.Bmi ?? 0)) : double.NaN;
            var lastHealth = healths.LastOrDefault();
            double healthLastGeneral = lastHealth != null ? (double)(lastHealth.GeneralHealthScore ?? 0) : double.NaN;
            double healthLastNutrition = lastHealth != null ? (double)(lastHealth.NutritionScore ?? 0) : double.NaN;
            double healthLastSleep = lastHealth != null ? (double)(lastHealth.SleepScore ?? 0) : double.NaN;
            double healthLastEnergy = lastHealth != null ? (double)(lastHealth.EnergyScore ?? 0) : double.NaN;
            double healthLastHeight = lastHealth != null ? (double)(lastHealth.HeightCm ?? 0) : double.NaN;
            double healthLastWeight = lastHealth != null ? (double)(lastHealth.WeightKg ?? 0) : double.NaN;
            double healthLastBmi = lastHealth != null ? (double)(lastHealth.Bmi ?? 0) : double.NaN;
            float healthLastMedical = lastHealth != null && lastHealth.MedicalCheckupDone ? 1f : 0f;
            float healthLastDental = lastHealth != null && lastHealth.DentalCheckupDone ? 1f : 0f;
            float healthLastPsych = lastHealth != null && lastHealth.PsychologicalCheckupDone ? 1f : 0f;

            // Incident aggregates — severity as numeric: Low=1, Medium=2, High=3
            static double SeverityScore(string? s) => s switch { "High" => 3, "Medium" => 2, "Low" => 1, _ => 1 };
            int incCount = incs.Count;
            int highSeverityCount = incs.Count(i => i.Severity == "High");
            int unresolvedCount = incs.Count(i => !i.Resolved);
            int followUpRequired = incs.Count(i => i.FollowUpRequired);
            double meanSeverity = incs.Count > 0 ? incs.Average(i => SeverityScore(i.Severity)) : double.NaN;
            var lastInc = incs.OrderByDescending(i => i.IncidentDate).FirstOrDefault();

            // Plan aggregates
            int planCount = resPlans.Count;
            int distinctPlanCategories = resPlans.Select(p => p.PlanCategory).Distinct().Count();
            double meanPlanTarget = resPlans.Count > 0 ? resPlans.Average(p => (double)(p.TargetValue ?? 0)) : double.NaN;
            int inProgressPlans = resPlans.Count(p => p.Status == "In Progress");
            int completedPlans = resPlans.Count(p => p.Status == "Completed");
            int onHoldPlans = resPlans.Count(p => p.Status == "On Hold");
            var lastPlan = resPlans.OrderByDescending(p => p.CreatedAt).FirstOrDefault();

            // Visitation aggregates
            int visitCount = visits.Count;
            int safetyConcernsCount = visits.Count(v => v.SafetyConcernsNoted);
            int followUpNeededCount = visits.Count(v => v.FollowUpNeeded);
            int favorableVisitCount = visits.Count(v => v.VisitOutcome == "Favorable" || v.VisitOutcome == "Positive");
            var lastVisit = visits.OrderByDescending(v => v.VisitDate).FirstOrDefault();

            // Session aggregates
            int sessionCount = recs.Count;
            double meanSessionDuration = recs.Count > 0 ? recs.Average(s => (double)s.SessionDurationMinutes) : double.NaN;
            int progressNotedCount = recs.Count(s => s.ProgressNoted == true);
            int concernsFlaggedCount = recs.Count(s => s.ConcernsFlagged == true);
            int referralMadeCount = recs.Count(s => s.ReferralMade == true);
            var lastRec = recs.OrderByDescending(s => s.SessionDate).FirstOrDefault();

            var numeric = new Dictionary<string, float>
            {
                ["sub_cat_orphaned"] = r.SubCatOrphaned ? 1f : 0f,
                ["sub_cat_trafficked"] = r.SubCatTrafficked ? 1f : 0f,
                ["sub_cat_child_labor"] = r.SubCatChildLabor ? 1f : 0f,
                ["sub_cat_physical_abuse"] = r.SubCatPhysicalAbuse ? 1f : 0f,
                ["sub_cat_sexual_abuse"] = r.SubCatSexualAbuse ? 1f : 0f,
                ["sub_cat_osaec"] = r.SubCatOsaec ? 1f : 0f,
                ["sub_cat_cicl"] = r.SubCatCicl ? 1f : 0f,
                ["sub_cat_at_risk"] = r.SubCatAtRisk ? 1f : 0f,
                ["sub_cat_street_child"] = r.SubCatStreetChild ? 1f : 0f,
                ["sub_cat_child_with_hiv"] = r.SubCatChildWithHiv ? 1f : 0f,
                ["is_pwd"] = r.IsPwd ? 1f : 0f,
                ["has_special_needs"] = r.HasSpecialNeeds ? 1f : 0f,
                ["family_is_4ps"] = r.FamilyIs4Ps ? 1f : 0f,
                ["family_solo_parent"] = r.FamilySoloParent ? 1f : 0f,
                ["family_indigenous"] = r.FamilyIndigenous ? 1f : 0f,
                ["family_parent_pwd"] = r.FamilyParentPwd ? 1f : 0f,
                ["family_informal_settler"] = r.FamilyInformalSettler ? 1f : 0f,
                ["admission_age_years"] = ToF(admissionAgeYears),
                ["days_since_admission"] = ToF(daysSinceAdmission),
                ["education_record_count"] = (float)eduCount,
                ["edu_mean_attendance_rate"] = ToF(eduMeanAtt),
                ["edu_mean_progress_percent"] = ToF(eduMeanProg),
                ["edu_max_attendance_rate"] = ToF(eduMaxAtt),
                ["edu_max_progress_percent"] = ToF(eduMaxProg),
                ["edu_last_attendance_rate"] = ToF(eduLastAtt),
                ["edu_last_progress_percent"] = ToF(eduLastProg),
                ["edu_completed_count"] = (float)eduCompletedCount,
                ["health_mean_general_health_score"] = ToF(healthMeanGeneral),
                ["health_mean_nutrition_score"] = ToF(healthMeanNutrition),
                ["health_mean_sleep_quality_score"] = ToF(healthMeanSleep),
                ["health_mean_energy_level_score"] = ToF(healthMeanEnergy),
                ["health_mean_height_cm"] = ToF(healthMeanHeight),
                ["health_mean_weight_kg"] = ToF(healthMeanWeight),
                ["health_mean_bmi"] = ToF(healthMeanBmi),
                ["health_last_general_health_score"] = ToF(healthLastGeneral),
                ["health_last_nutrition_score"] = ToF(healthLastNutrition),
                ["health_last_sleep_quality_score"] = ToF(healthLastSleep),
                ["health_last_energy_level_score"] = ToF(healthLastEnergy),
                ["health_last_height_cm"] = ToF(healthLastHeight),
                ["health_last_weight_kg"] = ToF(healthLastWeight),
                ["health_last_bmi"] = ToF(healthLastBmi),
                ["health_last_medical_checkup_done"] = healthLastMedical,
                ["health_last_dental_checkup_done"] = healthLastDental,
                ["health_last_psychological_checkup_done"] = healthLastPsych,
                ["incident_count"] = (float)incCount,
                ["high_severity_count"] = (float)highSeverityCount,
                ["unresolved_incident_count"] = (float)unresolvedCount,
                ["follow_up_required_count"] = (float)followUpRequired,
                ["mean_incident_severity_score"] = ToF(meanSeverity),
                ["plan_count"] = (float)planCount,
                ["distinct_plan_categories"] = (float)distinctPlanCategories,
                ["mean_plan_target_value"] = ToF(meanPlanTarget),
                ["in_progress_plan_count"] = (float)inProgressPlans,
                ["completed_plan_count"] = (float)completedPlans,
                ["on_hold_plan_count"] = (float)onHoldPlans,
                ["visit_count"] = (float)visitCount,
                ["safety_concerns_count"] = (float)safetyConcernsCount,
                ["follow_up_needed_count"] = (float)followUpNeededCount,
                ["favorable_visit_count"] = (float)favorableVisitCount,
                ["session_count"] = (float)sessionCount,
                ["mean_session_duration_minutes"] = ToF(meanSessionDuration),
                ["progress_noted_count"] = (float)progressNotedCount,
                ["concerns_flagged_count"] = (float)concernsFlaggedCount,
                ["referral_made_count"] = (float)referralMadeCount,
            };

            var categorical = new Dictionary<string, string>
            {
                ["sex"] = r.Sex ?? "missing",
                ["birth_status"] = r.BirthStatus ?? "missing",
                ["place_of_birth"] = r.PlaceOfBirth ?? "missing",
                ["religion"] = r.Religion ?? "missing",
                ["case_category"] = r.CaseCategory ?? "missing",
                ["pwd_type"] = r.PwdType ?? "missing",
                ["special_needs_diagnosis"] = r.SpecialNeedsDiagnosis ?? "missing",
                ["referral_source"] = r.ReferralSource ?? "missing",
                ["assigned_social_worker"] = r.AssignedSocialWorker ?? "missing",
                ["initial_case_assessment"] = r.InitialCaseAssessment ?? "missing",
                ["reintegration_type"] = r.ReintegrationType ?? "missing",
                ["initial_risk_level"] = r.InitialRiskLevel ?? "missing",
                ["current_risk_level"] = r.CurrentRiskLevel ?? "missing",
                ["edu_last_level"] = lastEdu?.EducationLevel ?? "missing",
                ["edu_last_school_name"] = lastEdu?.SchoolName ?? "missing",
                ["edu_last_enrollment_status"] = lastEdu?.EnrollmentStatus ?? "missing",
                ["edu_last_completion_status"] = lastEdu?.CompletionStatus ?? "missing",
                ["last_incident_type"] = lastInc?.IncidentType ?? "missing",
                ["last_incident_severity"] = lastInc?.Severity ?? "missing",
                ["last_incident_resolved"] = lastInc != null ? (lastInc.Resolved ? "True" : "False") : "missing",
                ["last_incident_follow_up_required"] = lastInc != null ? (lastInc.FollowUpRequired ? "True" : "False") : "missing",
                ["last_plan_category"] = lastPlan?.PlanCategory ?? "missing",
                ["last_plan_status"] = lastPlan?.Status ?? "missing",
                ["last_plan_services_provided"] = lastPlan?.ServicesProvided ?? "missing",
                ["last_visit_type"] = lastVisit?.VisitType ?? "missing",
                ["last_location_visited"] = lastVisit?.LocationVisited ?? "missing",
                ["last_family_cooperation_level"] = "missing", // not in model
                ["last_visit_outcome"] = lastVisit?.VisitOutcome ?? "missing",
                ["last_session_type"] = lastRec?.SessionType ?? "missing",
                ["last_emotional_state_observed"] = lastRec?.EmotionalStateObserved ?? "missing",
                ["last_emotional_state_end"] = lastRec?.EmotionalStateEnd ?? "missing",
                ["last_interventions_applied"] = "missing", // not in model
            };

            rows.Add(new ResidentFeatureRow { ResidentId = r.ResidentId, Numeric = numeric, Categorical = categorical });
        }

        return rows;
    }

    private List<(int ResidentId, float Probability)> RunOnnxInference(string modelPath, List<ResidentFeatureRow> rows)
    {
        try
        {
            using var session = OnnxRuntimeDiagnostics.CreateCpuOnlySession(modelPath, _logger, "ReintegrationReadiness");
            var inputs = new List<NamedOnnxValue>();

            foreach (var feat in NumericFeatures)
            {
                var data = rows.Select(r => r.Numeric.TryGetValue(feat, out var v) ? v : float.NaN).ToArray();
                inputs.Add(NamedOnnxValue.CreateFromTensor(feat, new DenseTensor<float>(data, [rows.Count, 1])));
            }
            foreach (var feat in CategoricalFeatures)
            {
                var data = rows.Select(r => r.Categorical.TryGetValue(feat, out var v) ? v : "missing").ToArray();
                inputs.Add(NamedOnnxValue.CreateFromTensor(feat, new DenseTensor<string>(data, [rows.Count, 1])));
            }

            using var results = session.Run(inputs);
            var probOutput = results.First(r => r.Name == "probabilities").AsTensor<float>();

            return Enumerable.Range(0, rows.Count)
                .Select(i => (rows[i].ResidentId, probOutput[i, 1]))
                .ToList();
        }
        catch (TypeInitializationException ex)
        {
            _logger.LogError(
                ex,
                "Type initialization failed while executing ONNX inference. Rows={Rows}, ModelPath={ModelPath}, Details={Details}",
                rows.Count,
                modelPath,
                OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex));
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "ONNX inference execution failed. Rows={Rows}, ModelPath={ModelPath}",
                rows.Count,
                modelPath);
            throw;
        }
    }

    private static float ToF(double v) => double.IsNaN(v) ? float.NaN : (float)v;

    private sealed class ResidentFeatureRow
    {
        public int ResidentId { get; init; }
        public Dictionary<string, float> Numeric { get; init; } = [];
        public Dictionary<string, string> Categorical { get; init; } = [];
    }
}
