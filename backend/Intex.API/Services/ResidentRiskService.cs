using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Intex.API.Services;

public class ResidentRiskOptions
{
    public string ClassificationModelPath { get; set; } = "ml-runtime/resident_risk_classification_model.onnx";
    public string RegressionModelPath { get; set; } = "ml-runtime/resident_risk_regression_model.onnx";
    public float ClassificationThreshold { get; set; } = 0.6713f;
    // Regression score ≥ 60 = high risk
    public float RegressionHighRiskThreshold { get; set; } = 60f;
}

public class ResidentRiskService : IResidentRiskService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ResidentRiskService> _logger;
    private readonly ResidentRiskOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;

    // Anchor date used by notebook for age/tenure calculations
    private static readonly DateOnly AnchorDate = new(2025, 9, 1);

    // Exact numeric cols from ONNX export output (43 features)
    private static readonly string[] NumericFeatures =
    [
        "age_at_anchor", "days_since_admission", "initial_risk_num", "is_active_case",
        "has_special_needs_flag", "is_pwd_flag",
        "family_is_4ps", "family_solo_parent", "family_indigenous", "family_parent_pwd", "family_informal_settler",
        "health_obs_count", "health_general_mean", "health_general_last", "nutrition_mean", "sleep_mean",
        "energy_mean", "bmi_last", "medical_check_rate", "psych_check_rate",
        "edu_obs_count", "attendance_mean", "attendance_last", "progress_mean", "progress_last",
        "completed_programs", "inprogress_programs",
        "session_count", "avg_session_duration", "progress_noted_rate", "concerns_flagged_rate",
        "referral_rate", "negative_end_emotion_rate",
        "incident_count", "high_severity_incidents", "unresolved_incidents",
        "visit_count", "favorable_visit_rate", "family_cooperation_good_rate",
        "plan_count", "achieved_plans", "on_hold_plans", "in_progress_plans",
    ];

    // Exact categorical cols from ONNX export output (7 features — follow_up counts encoded as strings)
    private static readonly string[] CategoricalFeatures =
    [
        "sex", "case_status", "case_category", "reintegration_type",
        "follow_up_incidents", "safety_concerns_noted_count", "follow_up_needed_count",
    ];

    public ResidentRiskService(
        IWebHostEnvironment environment,
        IOptions<ResidentRiskOptions> options,
        ILogger<ResidentRiskService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _environment = environment;
        _options = options.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<ResidentRiskResult> RunAsync(CancellationToken cancellationToken = default)
    {
        var startedAt = DateTimeOffset.UtcNow;
        try
        {
            var classPath = ResolveModelPath(_options.ClassificationModelPath);
            var regPath = ResolveModelPath(_options.RegressionModelPath);

            if (!File.Exists(classPath))
                throw new FileNotFoundException($"ONNX classification model not found: {classPath}");
            if (!File.Exists(regPath))
                throw new FileNotFoundException($"ONNX regression model not found: {regPath}");

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var residents = await db.Residents.AsNoTracking().ToListAsync(cancellationToken);
            var recordings = await db.ProcessRecordings.AsNoTracking().ToListAsync(cancellationToken);
            var incidents = await db.IncidentReports.AsNoTracking().ToListAsync(cancellationToken);
            var visitations = await db.HomeVisitations.AsNoTracking().ToListAsync(cancellationToken);
            var educationRecords = await db.EducationRecords.AsNoTracking().ToListAsync(cancellationToken);
            var healthRecords = await db.HealthWellbeingRecords.AsNoTracking().ToListAsync(cancellationToken);
            var plans = await db.InterventionPlans.AsNoTracking().ToListAsync(cancellationToken);

            var rows = BuildFeatureRows(residents, recordings, incidents, visitations, educationRecords, healthRecords, plans);

            if (rows.Count == 0)
                return new ResidentRiskResult(true, 0, startedAt, DateTimeOffset.UtcNow, "No residents found.", string.Empty);

            var classPredictions = RunClassificationInference(classPath, rows);
            var regPredictions = RunRegressionInference(regPath, rows);

            // Update residents.CurrentRiskLevel and write PredictionResults
            var residentIds = rows.Select(r => r.ResidentId).ToHashSet();
            var toUpdate = await db.Residents
                .Where(r => residentIds.Contains(r.ResidentId))
                .ToListAsync(cancellationToken);

            var classMap = classPredictions.ToDictionary(p => p.ResidentId, p => p.Probability);
            var regMap = regPredictions.ToDictionary(p => p.ResidentId, p => p.Score);

            foreach (var resident in toUpdate)
            {
                if (!regMap.TryGetValue(resident.ResidentId, out var score)) continue;
                resident.CurrentRiskLevel = score >= _options.RegressionHighRiskThreshold ? "High" : score >= 40 ? "Medium" : "Low";
            }

            // Remove today's risk predictions and write fresh ones
            var existingToday = await db.PredictionResults
                .Where(p => (p.ModelName == "resident_risk_classification" || p.ModelName == "resident_risk_regression")
                            && p.GeneratedAt >= DateTime.UtcNow.Date)
                .ToListAsync(cancellationToken);
            db.PredictionResults.RemoveRange(existingToday);

            var newResults = new List<PredictionResult>();
            for (int i = 0; i < rows.Count; i++)
            {
                float classProb = classPredictions[i].Probability;
                float regScore = regPredictions[i].Score;

                newResults.Add(new PredictionResult
                {
                    ResidentId = rows[i].ResidentId,
                    ModelName = "resident_risk_classification",
                    Score = (decimal)Math.Round(classProb, 3),
                    Label = classProb >= _options.ClassificationThreshold ? "HighRisk" : "LowRisk",
                    GeneratedAt = DateTime.UtcNow,
                });
                newResults.Add(new PredictionResult
                {
                    ResidentId = rows[i].ResidentId,
                    ModelName = "resident_risk_regression",
                    Score = (decimal)Math.Round(regScore, 1),
                    Label = regScore >= _options.RegressionHighRiskThreshold ? "High" : regScore >= 40 ? "Medium" : "Low",
                    GeneratedAt = DateTime.UtcNow,
                });
            }

            db.PredictionResults.AddRange(newResults);
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Resident risk inference complete. Updated {Residents} residents, wrote {Predictions} predictions.",
                toUpdate.Count, newResults.Count);
            return new ResidentRiskResult(true, toUpdate.Count, startedAt, DateTimeOffset.UtcNow,
                $"Updated {toUpdate.Count} residents, wrote {newResults.Count} prediction records.", string.Empty);
        }
        catch (TypeInitializationException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime type initialization failed during resident risk inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new ResidentRiskResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (DllNotFoundException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime native dependency load failed during resident risk inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new ResidentRiskResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (BadImageFormatException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime architecture mismatch or invalid native image during resident risk inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new ResidentRiskResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Resident risk inference failed.");
            return new ResidentRiskResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, ex.Message);
        }
    }

    private List<RiskFeatureRow> BuildFeatureRows(
        List<Resident> residents,
        List<ProcessRecording> recordings,
        List<IncidentReport> incidents,
        List<HomeVisitation> visitations,
        List<EducationRecord> educationRecords,
        List<HealthWellbeingRecord> healthRecords,
        List<InterventionPlan> plans)
    {
        var recByResident = recordings.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var incByResident = incidents.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var visitByResident = visitations.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var eduByResident = educationRecords.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.OrderBy(e => e.RecordDate).ToList());
        var healthByResident = healthRecords.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.OrderBy(h => h.RecordDate).ToList());
        var plansByResident = plans.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());

        static float RiskLevelNum(string? level) => level switch { "High" => 3f, "Medium" => 2f, "Low" => 1f, _ => 0f };

        var rows = new List<RiskFeatureRow>();

        foreach (var r in residents)
        {
            recByResident.TryGetValue(r.ResidentId, out var recs);
            incByResident.TryGetValue(r.ResidentId, out var incs);
            visitByResident.TryGetValue(r.ResidentId, out var visits);
            eduByResident.TryGetValue(r.ResidentId, out var edus);
            healthByResident.TryGetValue(r.ResidentId, out var healths);
            plansByResident.TryGetValue(r.ResidentId, out var resPlans);

            recs ??= [];
            incs ??= [];
            visits ??= [];
            edus ??= [];
            healths ??= [];
            resPlans ??= [];

            double ageAtAnchor = (AnchorDate.DayNumber - r.DateOfBirth.DayNumber) / 365.25;
            double daysSinceAdmission = r.DateOfAdmission != default
                ? (AnchorDate.DayNumber - r.DateOfAdmission.DayNumber) : 0;

            // Health
            int healthObsCount = healths.Count;
            var lastHealth = healths.LastOrDefault();
            double healthGeneralMean = healths.Count > 0 ? healths.Average(h => (double)(h.GeneralHealthScore ?? 0)) : 0;
            double healthGeneralLast = lastHealth != null ? (double)(lastHealth.GeneralHealthScore ?? 0) : 0;
            double nutritionMean = healths.Count > 0 ? healths.Average(h => (double)(h.NutritionScore ?? 0)) : 0;
            double sleepMean = healths.Count > 0 ? healths.Average(h => (double)(h.SleepScore ?? 0)) : 0;
            double energyMean = healths.Count > 0 ? healths.Average(h => (double)(h.EnergyScore ?? 0)) : 0;
            double bmiLast = lastHealth != null ? (double)(lastHealth.Bmi ?? 0) : 0;
            double medicalCheckRate = healths.Count > 0 ? healths.Average(h => h.MedicalCheckupDone ? 1.0 : 0.0) : 0;
            double psychCheckRate = healths.Count > 0 ? healths.Average(h => h.PsychologicalCheckupDone ? 1.0 : 0.0) : 0;

            // Education
            int eduObsCount = edus.Count;
            var lastEdu = edus.LastOrDefault();
            double attendanceMean = edus.Count > 0 ? edus.Average(e => (double)e.AttendanceRate) : 0;
            double attendanceLast = lastEdu != null ? (double)lastEdu.AttendanceRate : 0;
            double progressMean = edus.Count > 0 ? edus.Average(e => (double)e.ProgressPercent) : 0;
            double progressLast = lastEdu != null ? (double)lastEdu.ProgressPercent : 0;
            int completedPrograms = edus.Count(e => e.CompletionStatus == "Completed");
            int inProgressPrograms = edus.Count(e => e.CompletionStatus == "In Progress");

            // Sessions
            int sessionCount = recs.Count;
            double avgSessionDuration = 0;
            double progressNotedRate = sessionCount > 0 ? recs.Count(s => s.ProgressNoted == true) / (double)sessionCount : 0;
            double concernsFlaggedRate = sessionCount > 0 ? recs.Count(s => s.ConcernsFlagged == true) / (double)sessionCount : 0;
            double referralRate = sessionCount > 0 ? recs.Count(s => s.ReferralMade == true) / (double)sessionCount : 0;
            double negativeEndEmotionRate = sessionCount > 0
                ? recs.Count(s => s.EmotionalStateEnd is "Sad" or "Angry" or "Anxious" or "Distressed") / (double)sessionCount : 0;

            // Incidents
            int incidentCount = incs.Count;
            int highSeverityInc = incs.Count(i => i.Severity == "High");
            int unresolvedInc = incs.Count(i => !i.Resolved);
            int followUpInc = incs.Count(i => i.FollowUpRequired);

            // Visitations
            int visitCount = visits.Count;
            double favorableVisitRate = visitCount > 0
                ? visits.Count(v => v.VisitOutcome == "Favorable" || v.VisitOutcome == "Positive") / (double)visitCount : 0;
            double familyCooperationGoodRate = 0; // not in model
            int safetyConcernsCount = visits.Count(v => v.SafetyConcernsNoted);
            int followUpNeededCount = visits.Count(v => v.FollowUpNeeded);

            // Plans
            int planCount = resPlans.Count;
            int achievedPlans = resPlans.Count(p => p.Status == "Completed");
            int onHoldPlans = resPlans.Count(p => p.Status == "On Hold");
            int inProgressPlans = resPlans.Count(p => p.Status == "In Progress");

            var numeric = new Dictionary<string, float>
            {
                ["age_at_anchor"] = (float)ageAtAnchor,
                ["days_since_admission"] = (float)daysSinceAdmission,
                ["initial_risk_num"] = RiskLevelNum(r.InitialRiskLevel),
                ["is_active_case"] = r.CaseStatus == "Active" ? 1f : 0f,
                ["has_special_needs_flag"] = r.HasSpecialNeeds ? 1f : 0f,
                ["is_pwd_flag"] = r.IsPwd ? 1f : 0f,
                ["family_is_4ps"] = r.FamilyIs4Ps ? 1f : 0f,
                ["family_solo_parent"] = r.FamilySoloParent ? 1f : 0f,
                ["family_indigenous"] = r.FamilyIndigenous ? 1f : 0f,
                ["family_parent_pwd"] = r.FamilyParentPwd ? 1f : 0f,
                ["family_informal_settler"] = r.FamilyInformalSettler ? 1f : 0f,
                ["health_obs_count"] = (float)healthObsCount,
                ["health_general_mean"] = (float)healthGeneralMean,
                ["health_general_last"] = (float)healthGeneralLast,
                ["nutrition_mean"] = (float)nutritionMean,
                ["sleep_mean"] = (float)sleepMean,
                ["energy_mean"] = (float)energyMean,
                ["bmi_last"] = (float)bmiLast,
                ["medical_check_rate"] = (float)medicalCheckRate,
                ["psych_check_rate"] = (float)psychCheckRate,
                ["edu_obs_count"] = (float)eduObsCount,
                ["attendance_mean"] = (float)attendanceMean,
                ["attendance_last"] = (float)attendanceLast,
                ["progress_mean"] = (float)progressMean,
                ["progress_last"] = (float)progressLast,
                ["completed_programs"] = (float)completedPrograms,
                ["inprogress_programs"] = (float)inProgressPrograms,
                ["session_count"] = (float)sessionCount,
                ["avg_session_duration"] = (float)avgSessionDuration,
                ["progress_noted_rate"] = (float)progressNotedRate,
                ["concerns_flagged_rate"] = (float)concernsFlaggedRate,
                ["referral_rate"] = (float)referralRate,
                ["negative_end_emotion_rate"] = (float)negativeEndEmotionRate,
                ["incident_count"] = (float)incidentCount,
                ["high_severity_incidents"] = (float)highSeverityInc,
                ["unresolved_incidents"] = (float)unresolvedInc,
                ["visit_count"] = (float)visitCount,
                ["favorable_visit_rate"] = (float)favorableVisitRate,
                ["family_cooperation_good_rate"] = (float)familyCooperationGoodRate,
                ["plan_count"] = (float)planCount,
                ["achieved_plans"] = (float)achievedPlans,
                ["on_hold_plans"] = (float)onHoldPlans,
                ["in_progress_plans"] = (float)inProgressPlans,
            };

            var categorical = new Dictionary<string, string>
            {
                ["sex"] = r.Sex ?? "missing",
                ["case_status"] = r.CaseStatus ?? "missing",
                ["case_category"] = r.CaseCategory ?? "missing",
                ["reintegration_type"] = r.ReintegrationType ?? "missing",
                // Count features mapped as strings because model treats them as categorical
                ["follow_up_incidents"] = followUpInc.ToString(),
                ["safety_concerns_noted_count"] = safetyConcernsCount.ToString(),
                ["follow_up_needed_count"] = followUpNeededCount.ToString(),
            };

            rows.Add(new RiskFeatureRow { ResidentId = r.ResidentId, Numeric = numeric, Categorical = categorical });
        }

        return rows;
    }

    private List<(int ResidentId, float Probability)> RunClassificationInference(string modelPath, List<RiskFeatureRow> rows)
    {
        try
        {
            using var session = OnnxRuntimeDiagnostics.CreateCpuOnlySession(modelPath, _logger, "ResidentRisk-Classification");
            var inputs = BuildInputs(rows);
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
                "Type initialization failed while executing ONNX classification inference. Rows={Rows}, ModelPath={ModelPath}, Details={Details}",
                rows.Count,
                modelPath,
                OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex));
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "ONNX classification inference execution failed. Rows={Rows}, ModelPath={ModelPath}",
                rows.Count,
                modelPath);
            throw;
        }
    }

    private List<(int ResidentId, float Score)> RunRegressionInference(string modelPath, List<RiskFeatureRow> rows)
    {
        try
        {
            using var session = OnnxRuntimeDiagnostics.CreateCpuOnlySession(modelPath, _logger, "ResidentRisk-Regression");
            var inputs = BuildInputs(rows);
            using var results = session.Run(inputs);
            var output = results.First(r => r.Name == "variable").AsTensor<float>();
            return Enumerable.Range(0, rows.Count)
                .Select(i => (rows[i].ResidentId, output[i]))
                .ToList();
        }
        catch (TypeInitializationException ex)
        {
            _logger.LogError(
                ex,
                "Type initialization failed while executing ONNX regression inference. Rows={Rows}, ModelPath={ModelPath}, Details={Details}",
                rows.Count,
                modelPath,
                OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex));
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "ONNX regression inference execution failed. Rows={Rows}, ModelPath={ModelPath}",
                rows.Count,
                modelPath);
            throw;
        }
    }

    private List<NamedOnnxValue> BuildInputs(List<RiskFeatureRow> rows)
    {
        var inputs = new List<NamedOnnxValue>();
        foreach (var feat in NumericFeatures)
        {
            var data = rows.Select(r => r.Numeric.TryGetValue(feat, out var v) ? v : 0f).ToArray();
            inputs.Add(NamedOnnxValue.CreateFromTensor(feat, new DenseTensor<float>(data, [rows.Count, 1])));
        }
        foreach (var feat in CategoricalFeatures)
        {
            var data = rows.Select(r => r.Categorical.TryGetValue(feat, out var v) ? v : "missing").ToArray();
            inputs.Add(NamedOnnxValue.CreateFromTensor(feat, new DenseTensor<string>(data, [rows.Count, 1])));
        }
        return inputs;
    }

    private string ResolveModelPath(string path) =>
        Path.IsPathRooted(path) ? path : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, path));

    private sealed class RiskFeatureRow
    {
        public int ResidentId { get; init; }
        public Dictionary<string, float> Numeric { get; init; } = [];
        public Dictionary<string, string> Categorical { get; init; } = [];
    }
}
