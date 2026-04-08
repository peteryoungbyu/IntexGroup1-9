using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Intex.API.Services;

public class InterventionEffectivenessOptions
{
    public string ModelPath { get; set; } = "ml-runtime/intervention_effectiveness_model.onnx";
    public float Threshold { get; set; } = 0.45f;
}

public class InterventionEffectivenessService : IInterventionEffectivenessService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<InterventionEffectivenessService> _logger;
    private readonly InterventionEffectivenessOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;

    // Exact numeric cols from ONNX export output (19 features)
    private static readonly string[] NumericFeatures =
    [
        "session_count", "avg_session_duration", "progress_noted_rate", "concerns_flagged_rate",
        "referral_rate", "incident_count", "high_severity_incidents", "unresolved_incidents",
        "visit_count", "favorable_visit_count", "avg_attendance_rate", "max_progress_percent",
        "completed_program_count", "general_health_score", "nutrition_score",
        "sleep_quality_score", "energy_level_score", "psychological_checkup_done",
        "plan_duration_days",
    ];

    // Exact categorical cols from ONNX export output (4 features — counts encoded as strings by model)
    private static readonly string[] CategoricalFeatures =
    [
        "plan_category_std", "follow_up_incidents", "safety_concerns_noted_count", "follow_up_needed_count",
    ];

    public InterventionEffectivenessService(
        IWebHostEnvironment environment,
        IOptions<InterventionEffectivenessOptions> options,
        ILogger<InterventionEffectivenessService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _environment = environment;
        _options = options.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<InterventionEffectivenessResult> RunAsync(CancellationToken cancellationToken = default)
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

            var plans = await db.InterventionPlans.AsNoTracking().ToListAsync(cancellationToken);
            var recordings = await db.ProcessRecordings.AsNoTracking().ToListAsync(cancellationToken);
            var incidents = await db.IncidentReports.AsNoTracking().ToListAsync(cancellationToken);
            var visitations = await db.HomeVisitations.AsNoTracking().ToListAsync(cancellationToken);
            var educationRecords = await db.EducationRecords.AsNoTracking().ToListAsync(cancellationToken);
            var healthRecords = await db.HealthWellbeingRecords.AsNoTracking().ToListAsync(cancellationToken);

            var rows = BuildFeatureRows(plans, recordings, incidents, visitations, educationRecords, healthRecords);

            if (rows.Count == 0)
                return new InterventionEffectivenessResult(true, 0, startedAt, DateTimeOffset.UtcNow, "No plans found.", string.Empty);

            var predictions = RunOnnxInference(modelPath, rows);

            var existingToday = await db.PredictionResults
                .Where(p => p.ModelName == "intervention_effectiveness" && p.GeneratedAt >= DateTime.UtcNow.Date)
                .ToListAsync(cancellationToken);
            db.PredictionResults.RemoveRange(existingToday);

            var newResults = predictions.Select(p => new PredictionResult
            {
                ResidentId = p.ResidentId,
                ModelName = "intervention_effectiveness",
                Score = (decimal)Math.Round(p.Probability, 3),
                Label = p.Probability >= _options.Threshold ? "Effective" : "NotEffective",
                GeneratedAt = DateTime.UtcNow,
            }).ToList();

            db.PredictionResults.AddRange(newResults);
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Intervention effectiveness inference complete. Updated: {Count}", newResults.Count);
            return new InterventionEffectivenessResult(true, newResults.Count, startedAt, DateTimeOffset.UtcNow,
                $"Wrote {newResults.Count} predictions.", string.Empty);
        }
        catch (TypeInitializationException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime type initialization failed during intervention effectiveness inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new InterventionEffectivenessResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (DllNotFoundException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime native dependency load failed during intervention effectiveness inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new InterventionEffectivenessResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (BadImageFormatException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime architecture mismatch or invalid native image during intervention effectiveness inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new InterventionEffectivenessResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Intervention effectiveness inference failed.");
            return new InterventionEffectivenessResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, ex.Message);
        }
    }

    private List<PlanFeatureRow> BuildFeatureRows(
        List<InterventionPlan> plans,
        List<ProcessRecording> recordings,
        List<IncidentReport> incidents,
        List<HomeVisitation> visitations,
        List<EducationRecord> educationRecords,
        List<HealthWellbeingRecord> healthRecords)
    {
        var recByResident = recordings.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var incByResident = incidents.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var visitByResident = visitations.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var eduByResident = educationRecords.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());
        var healthByResident = healthRecords.GroupBy(r => r.ResidentId).ToDictionary(g => g.Key, g => g.ToList());

        var rows = new List<PlanFeatureRow>();

        foreach (var plan in plans)
        {
            recByResident.TryGetValue(plan.ResidentId, out var recs);
            incByResident.TryGetValue(plan.ResidentId, out var incs);
            visitByResident.TryGetValue(plan.ResidentId, out var visits);
            eduByResident.TryGetValue(plan.ResidentId, out var edus);
            healthByResident.TryGetValue(plan.ResidentId, out var healths);

            recs ??= [];
            incs ??= [];
            visits ??= [];
            edus ??= [];
            healths ??= [];

            // Session aggregates
            int sessionCount = recs.Count;
            double avgSessionDuration = recs.Count > 0 ? recs.Average(r => (double)r.SessionDurationMinutes) : 0.0;
            double progressNotedRate = sessionCount > 0 ? recs.Count(r => r.ProgressNoted == true) / (double)sessionCount : 0.0;
            double concernsFlaggedRate = sessionCount > 0 ? recs.Count(r => r.ConcernsFlagged == true) / (double)sessionCount : 0.0;
            double referralRate = sessionCount > 0 ? recs.Count(r => r.ReferralMade == true) / (double)sessionCount : 0.0;

            // Incident aggregates
            int incidentCount = incs.Count;
            int highSeverityInc = incs.Count(i => i.Severity == "High");
            int unresolvedInc = incs.Count(i => !i.Resolved);
            int followUpInc = incs.Count(i => i.FollowUpRequired);

            // Visitation aggregates
            int visitCount = visits.Count;
            int favorableVisitCount = visits.Count(v => v.VisitOutcome == "Favorable" || v.VisitOutcome == "Positive");
            int safetyConcernsCount = visits.Count(v => v.SafetyConcernsNoted);
            int followUpNeededCount = visits.Count(v => v.FollowUpNeeded);

            // Education aggregates
            double avgAttendanceRate = edus.Count > 0 ? edus.Average(e => (double)e.AttendanceRate) : 0.0;
            double maxProgressPercent = edus.Count > 0 ? (double)edus.Max(e => e.ProgressPercent) : 0.0;
            int completedProgramCount = edus.Count(e => e.CompletionStatus == "Completed");

            // Health aggregates (latest record)
            var lastHealth = healths.OrderByDescending(h => h.RecordDate).FirstOrDefault();
            double generalHealthScore = lastHealth != null ? (double)(lastHealth.GeneralHealthScore ?? 0) : 0.0;
            double nutritionScore = lastHealth != null ? (double)(lastHealth.NutritionScore ?? 0) : 0.0;
            double sleepQualityScore = lastHealth != null ? (double)(lastHealth.SleepScore ?? 0) : 0.0;
            double energyLevelScore = lastHealth != null ? (double)(lastHealth.EnergyScore ?? 0) : 0.0;
            float psychCheckupDone = lastHealth != null && lastHealth.PsychologicalCheckupDone ? 1f : 0f;

            // Plan duration
            double planDurationDays = plan.TargetDate.HasValue
                ? Math.Max((plan.TargetDate.Value.DayNumber - DateOnly.FromDateTime(plan.CreatedAt).DayNumber), 0)
                : 0.0;

            var numeric = new Dictionary<string, float>
            {
                ["session_count"] = (float)sessionCount,
                ["avg_session_duration"] = (float)avgSessionDuration,
                ["progress_noted_rate"] = (float)progressNotedRate,
                ["concerns_flagged_rate"] = (float)concernsFlaggedRate,
                ["referral_rate"] = (float)referralRate,
                ["incident_count"] = (float)incidentCount,
                ["high_severity_incidents"] = (float)highSeverityInc,
                ["unresolved_incidents"] = (float)unresolvedInc,
                ["visit_count"] = (float)visitCount,
                ["favorable_visit_count"] = (float)favorableVisitCount,
                ["avg_attendance_rate"] = (float)avgAttendanceRate,
                ["max_progress_percent"] = (float)maxProgressPercent,
                ["completed_program_count"] = (float)completedProgramCount,
                ["general_health_score"] = (float)generalHealthScore,
                ["nutrition_score"] = (float)nutritionScore,
                ["sleep_quality_score"] = (float)sleepQualityScore,
                ["energy_level_score"] = (float)energyLevelScore,
                ["psychological_checkup_done"] = psychCheckupDone,
                ["plan_duration_days"] = (float)planDurationDays,
            };

            // The model OneHotEncodes these count fields as categorical strings
            var categorical = new Dictionary<string, string>
            {
                ["plan_category_std"] = plan.PlanCategory ?? "missing",
                ["follow_up_incidents"] = followUpInc.ToString(),
                ["safety_concerns_noted_count"] = safetyConcernsCount.ToString(),
                ["follow_up_needed_count"] = followUpNeededCount.ToString(),
            };

            rows.Add(new PlanFeatureRow { PlanId = plan.PlanId, ResidentId = plan.ResidentId, Numeric = numeric, Categorical = categorical });
        }

        return rows;
    }

    private List<(int PlanId, int ResidentId, float Probability)> RunOnnxInference(string modelPath, List<PlanFeatureRow> rows)
    {
        try
        {
            using var session = OnnxRuntimeDiagnostics.CreateCpuOnlySession(modelPath, _logger, "InterventionEffectiveness");
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

            using var results = session.Run(inputs);
            var probOutput = results.First(r => r.Name == "probabilities").AsTensor<float>();

            return Enumerable.Range(0, rows.Count)
                .Select(i => (rows[i].PlanId, rows[i].ResidentId, probOutput[i, 1]))
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

    private sealed class PlanFeatureRow
    {
        public int PlanId { get; init; }
        public int ResidentId { get; init; }
        public Dictionary<string, float> Numeric { get; init; } = [];
        public Dictionary<string, string> Categorical { get; init; } = [];
    }
}
