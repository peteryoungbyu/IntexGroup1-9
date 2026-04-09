using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Intex.API.Services;

public class ReportInferenceTableService : IReportInferenceTableService
{
    private const string TextFormat = "text";
    private const string PercentFormat = "percent";
    private const string CurrencyFormat = "currency";
    private const string BadgeFormat = "badge";
    private const string DateTimeFormat = "datetime";

    private static readonly IReadOnlyList<ReportInferenceColumnDto> ReintegrationColumns =
    [
        new("caseControlNo", "Case #", TextFormat),
        new("caseCategory", "Case Category", TextFormat),
        new("reintegrationType", "Reintegration Type", TextFormat),
        new("currentRisk", "Current Risk", BadgeFormat),
        new("readinessPercent", "Readiness %", PercentFormat),
        new("prediction", "Prediction", BadgeFormat),
        new("generatedAt", "Generated", DateTimeFormat),
    ];

    private static readonly IReadOnlyList<ReportInferenceColumnDto> DonorUpsellColumns =
    [
        new("supporterName", "Supporter", TextFormat),
        new("supporterType", "Type", TextFormat),
        new("status", "Status", BadgeFormat),
        new("upsellPercent", "Upsell %", PercentFormat),
        new("prediction", "Prediction", BadgeFormat),
        new("generatedAt", "Generated", DateTimeFormat),
    ];

    private static readonly IReadOnlyList<ReportInferenceColumnDto> InterventionColumns =
    [
        new("caseControlNo", "Case #", TextFormat),
        new("caseCategory", "Case Category", TextFormat),
        new("caseStatus", "Case Status", BadgeFormat),
        new("effectivenessPercent", "Effectiveness %", PercentFormat),
        new("prediction", "Prediction", BadgeFormat),
        new("generatedAt", "Generated", DateTimeFormat),
    ];

    private static readonly IReadOnlyList<ReportInferenceColumnDto> SocialMediaColumns =
    [
        new("postIdDisplay", "Post ID", TextFormat),
        new("platform", "Platform", TextFormat),
        new("postType", "Post Type", TextFormat),
        new("campaign", "Campaign", TextFormat),
        new("donationPercent", "Donation %", PercentFormat),
        new("predictedAmountPhp", "Predicted Amount (PHP)", CurrencyFormat),
        new("prediction", "Prediction", BadgeFormat),
        new("generatedAt", "Generated", DateTimeFormat),
    ];

    private static readonly IReadOnlyList<ReportInferenceColumnDto> ResidentRiskColumns =
    [
        new("caseControlNo", "Case #", TextFormat),
        new("caseCategory", "Case Category", TextFormat),
        new("caseStatus", "Case Status", BadgeFormat),
        new("highRiskPercent", "High-Risk %", PercentFormat),
        new("riskScore", "Risk Score", TextFormat),
        new("riskBand", "Risk Band", BadgeFormat),
        new("generatedAt", "Generated", DateTimeFormat),
    ];

    private readonly AppDbContext _db;

    public ReportInferenceTableService(AppDbContext db) => _db = db;

    public async Task<ReportInferenceTableDto?> GetAsync(
        string jobKey,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        // limit <= 0 means return all rows for the selected inference job.
        limit = limit <= 0 ? int.MaxValue : Math.Max(1, limit);

        return NormalizeJobKey(jobKey) switch
        {
            "reintegration-readiness" => await BuildReintegrationTableAsync(limit, cancellationToken),
            "donor-upsell" => await BuildDonorUpsellTableAsync(limit, cancellationToken),
            "intervention-effectiveness" => await BuildInterventionTableAsync(limit, cancellationToken),
            "social-media-donations" => await BuildSocialMediaTableAsync(limit, cancellationToken),
            "resident-risk" => await BuildResidentRiskTableAsync(limit, cancellationToken),
            _ => null,
        };
    }

    private async Task<ReportInferenceTableDto> BuildReintegrationTableAsync(int limit, CancellationToken cancellationToken)
    {
        var predictions = await GetLatestResidentPredictionsAsync("reintegration_readiness", cancellationToken);
        var residents = await GetResidentsAsync(predictions.Keys, cancellationToken);

        var rows = predictions
            .Select(entry => CreateReintegrationRow(entry.Key, entry.Value, residents))
            .Where(row => row is not null)
            .OrderByDescending(row => row!.SortPrimary)
            .ThenByDescending(row => row!.GeneratedAt)
            .Take(limit)
            .Select(row => row!.Values)
            .ToList();

        return new ReportInferenceTableDto("reintegration-readiness", null, ReintegrationColumns, rows);
    }

    private async Task<ReportInferenceTableDto> BuildDonorUpsellTableAsync(int limit, CancellationToken cancellationToken)
    {
        var predictions = await GetLatestSupporterPredictionsAsync("donor_upsell", cancellationToken);
        var supporters = await GetSupportersAsync(predictions.Keys, cancellationToken);

        var rows = predictions
            .Select(entry => CreateDonorUpsellRow(entry.Key, entry.Value, supporters))
            .Where(row => row is not null)
            .OrderByDescending(row => row!.SortPrimary)
            .ThenByDescending(row => row!.GeneratedAt)
            .Take(limit)
            .Select(row => row!.Values)
            .ToList();

        return new ReportInferenceTableDto("donor-upsell", null, DonorUpsellColumns, rows);
    }

    private async Task<ReportInferenceTableDto> BuildInterventionTableAsync(int limit, CancellationToken cancellationToken)
    {
        var predictions = await GetLatestResidentPredictionsAsync("intervention_effectiveness", cancellationToken);
        var residents = await GetResidentsAsync(predictions.Keys, cancellationToken);

        var rows = predictions
            .Select(entry => CreateInterventionRow(entry.Key, entry.Value, residents))
            .Where(row => row is not null)
            .OrderByDescending(row => row!.SortPrimary)
            .ThenByDescending(row => row!.GeneratedAt)
            .Take(limit)
            .Select(row => row!.Values)
            .ToList();

        return new ReportInferenceTableDto(
            "intervention-effectiveness",
            "Resident-level summary; plan-level context is not stored yet.",
            InterventionColumns,
            rows);
    }

    private async Task<ReportInferenceTableDto> BuildSocialMediaTableAsync(int limit, CancellationToken cancellationToken)
    {
        var classification = await GetLatestPostPredictionsAsync("social_media_classification", cancellationToken);
        var regression = await GetLatestPostPredictionsAsync("social_media_regression", cancellationToken);

        var postIds = classification.Keys
            .Union(regression.Keys)
            .Distinct()
            .ToList();

        var posts = await _db.SocialMediaPosts
            .AsNoTracking()
            .Where(post => postIds.Contains(post.PostId))
            .ToDictionaryAsync(post => post.PostId, cancellationToken);

        var rows = postIds
            .Select(postId => CreateSocialMediaRow(
                postId,
                classification.GetValueOrDefault(postId),
                regression.GetValueOrDefault(postId),
                posts))
            .Where(row => row is not null)
            .OrderByDescending(row => row!.SortPrimary)
            .ThenByDescending(row => row!.SortSecondary)
            .ThenByDescending(row => row!.GeneratedAt)
            .Take(limit)
            .Select(row => row!.Values)
            .ToList();

        return new ReportInferenceTableDto("social-media-donations", null, SocialMediaColumns, rows);
    }

    private async Task<ReportInferenceTableDto> BuildResidentRiskTableAsync(int limit, CancellationToken cancellationToken)
    {
        var classification = await GetLatestResidentPredictionsAsync("resident_risk_classification", cancellationToken);
        var regression = await GetLatestResidentPredictionsAsync("resident_risk_regression", cancellationToken);

        var residentIds = classification.Keys
            .Union(regression.Keys)
            .Distinct()
            .ToList();

        var residents = await GetResidentsAsync(residentIds, cancellationToken);

        var rows = residentIds
            .Select(residentId => CreateResidentRiskRow(
                residentId,
                classification.GetValueOrDefault(residentId),
                regression.GetValueOrDefault(residentId),
                residents))
            .Where(row => row is not null)
            .OrderByDescending(row => row!.SortPrimary)
            .ThenByDescending(row => row!.SortSecondary)
            .ThenByDescending(row => row!.GeneratedAt)
            .Take(limit)
            .Select(row => row!.Values)
            .ToList();

        return new ReportInferenceTableDto("resident-risk", null, ResidentRiskColumns, rows);
    }

    private async Task<Dictionary<int, Resident>> GetResidentsAsync(IEnumerable<int> residentIds, CancellationToken cancellationToken)
    {
        var ids = residentIds.Distinct().ToList();
        if (ids.Count == 0)
            return [];

        return await _db.Residents
            .AsNoTracking()
            .Where(resident => ids.Contains(resident.ResidentId))
            .ToDictionaryAsync(resident => resident.ResidentId, cancellationToken);
    }

    private async Task<Dictionary<int, Supporter>> GetSupportersAsync(IEnumerable<int> supporterIds, CancellationToken cancellationToken)
    {
        var ids = supporterIds.Distinct().ToList();
        if (ids.Count == 0)
            return [];

        return await _db.Supporters
            .AsNoTracking()
            .Where(supporter => ids.Contains(supporter.SupporterId))
            .ToDictionaryAsync(supporter => supporter.SupporterId, cancellationToken);
    }

    private async Task<Dictionary<int, PredictionResult>> GetLatestResidentPredictionsAsync(
        string modelName,
        CancellationToken cancellationToken)
    {
        var predictions = await _db.PredictionResults
            .AsNoTracking()
            .Where(prediction => prediction.ModelName == modelName && prediction.ResidentId.HasValue)
            .OrderByDescending(prediction => prediction.GeneratedAt)
            .ToListAsync(cancellationToken);

        return SelectLatestByKey(predictions, prediction => prediction.ResidentId);
    }

    private async Task<Dictionary<int, PredictionResult>> GetLatestSupporterPredictionsAsync(
        string modelName,
        CancellationToken cancellationToken)
    {
        var predictions = await _db.PredictionResults
            .AsNoTracking()
            .Where(prediction => prediction.ModelName == modelName && prediction.SupporterId.HasValue)
            .OrderByDescending(prediction => prediction.GeneratedAt)
            .ToListAsync(cancellationToken);

        return SelectLatestByKey(predictions, prediction => prediction.SupporterId);
    }

    private async Task<Dictionary<int, PredictionResult>> GetLatestPostPredictionsAsync(
        string modelName,
        CancellationToken cancellationToken)
    {
        var predictions = await _db.PredictionResults
            .AsNoTracking()
            .Where(prediction => prediction.ModelName == modelName)
            .OrderByDescending(prediction => prediction.GeneratedAt)
            .ToListAsync(cancellationToken);

        return SelectLatestByKey(predictions, GetPostId);
    }

    private static Dictionary<int, PredictionResult> SelectLatestByKey(
        IEnumerable<PredictionResult> predictions,
        Func<PredictionResult, int?> keySelector)
    {
        var latest = new Dictionary<int, PredictionResult>();

        foreach (var prediction in predictions)
        {
            var key = keySelector(prediction);
            if (key.HasValue && !latest.ContainsKey(key.Value))
                latest[key.Value] = prediction;
        }

        return latest;
    }

    private static ReportRow? CreateReintegrationRow(
        int residentId,
        PredictionResult prediction,
        IReadOnlyDictionary<int, Resident> residents)
    {
        if (!residents.TryGetValue(residentId, out var resident))
            return null;

        return new ReportRow(
            (double)prediction.Score,
            0d,
            prediction.GeneratedAt,
            CreateRow(
                ("residentId", resident.ResidentId),
                ("caseControlNo", resident.CaseControlNo),
                ("caseCategory", resident.CaseCategory),
                ("reintegrationType", resident.ReintegrationType),
                ("currentRisk", resident.CurrentRiskLevel),
                ("readinessPercent", (double)prediction.Score),
                ("prediction", prediction.Label),
                ("generatedAt", prediction.GeneratedAt)));
    }

    private static ReportRow? CreateDonorUpsellRow(
        int supporterId,
        PredictionResult prediction,
        IReadOnlyDictionary<int, Supporter> supporters)
    {
        if (!supporters.TryGetValue(supporterId, out var supporter))
            return null;

        return new ReportRow(
            (double)prediction.Score,
            0d,
            prediction.GeneratedAt,
            CreateRow(
                ("supporterId", supporter.SupporterId),
                ("supporterName", GetSupporterName(supporter)),
                ("supporterType", supporter.SupporterType),
                ("status", supporter.Status),
                ("upsellPercent", (double)prediction.Score),
                ("prediction", prediction.Label),
                ("generatedAt", prediction.GeneratedAt)));
    }

    private static ReportRow? CreateInterventionRow(
        int residentId,
        PredictionResult prediction,
        IReadOnlyDictionary<int, Resident> residents)
    {
        if (!residents.TryGetValue(residentId, out var resident))
            return null;

        return new ReportRow(
            (double)prediction.Score,
            0d,
            prediction.GeneratedAt,
            CreateRow(
                ("residentId", resident.ResidentId),
                ("caseControlNo", resident.CaseControlNo),
                ("caseCategory", resident.CaseCategory),
                ("caseStatus", resident.CaseStatus),
                ("effectivenessPercent", (double)prediction.Score),
                ("prediction", prediction.Label),
                ("generatedAt", prediction.GeneratedAt)));
    }

    private static ReportRow? CreateSocialMediaRow(
        int postId,
        PredictionResult? classification,
        PredictionResult? regression,
        IReadOnlyDictionary<int, SocialMediaPost> posts)
    {
        if (!posts.TryGetValue(postId, out var post))
            return null;

        var generatedAt = MaxGeneratedAt(classification?.GeneratedAt, regression?.GeneratedAt);
        var predictedAmount = regression is null ? null : GetPredictedAmountPhp(regression);
        var donationPercent = classification is null ? null : (double?)classification.Score;

        return new ReportRow(
            (double)(predictedAmount ?? 0m),
            donationPercent ?? 0d,
            generatedAt,
            CreateRow(
                ("postId", post.PostId),
                ("postIdDisplay", post.PostId.ToString()),
                ("platform", post.Platform),
                ("postType", post.PostType),
                ("campaign", post.CampaignName),
                ("donationPercent", donationPercent),
                ("predictedAmountPhp", predictedAmount),
                ("prediction", classification?.Label),
                ("generatedAt", generatedAt)));
    }

    private static ReportRow? CreateResidentRiskRow(
        int residentId,
        PredictionResult? classification,
        PredictionResult? regression,
        IReadOnlyDictionary<int, Resident> residents)
    {
        if (!residents.TryGetValue(residentId, out var resident))
            return null;

        var generatedAt = MaxGeneratedAt(classification?.GeneratedAt, regression?.GeneratedAt);
        var riskScore = regression is null ? null : (double?)regression.Score;
        var highRiskPercent = classification is null ? null : (double?)classification.Score;

        return new ReportRow(
            riskScore ?? 0d,
            highRiskPercent ?? 0d,
            generatedAt,
            CreateRow(
                ("residentId", resident.ResidentId),
                ("caseControlNo", resident.CaseControlNo),
                ("caseCategory", resident.CaseCategory),
                ("caseStatus", resident.CaseStatus),
                ("highRiskPercent", highRiskPercent),
                ("riskScore", riskScore),
                ("riskBand", regression?.Label ?? classification?.Label),
                ("generatedAt", generatedAt)));
    }

    private static string GetSupporterName(Supporter supporter)
    {
        if (!string.IsNullOrWhiteSpace(supporter.DisplayName))
            return supporter.DisplayName;

        if (!string.IsNullOrWhiteSpace(supporter.OrganizationName))
            return supporter.OrganizationName;

        var fullName = string.Join(" ", new[] { supporter.FirstName, supporter.LastName }
            .Where(value => !string.IsNullOrWhiteSpace(value)));

        return string.IsNullOrWhiteSpace(fullName) ? $"Supporter {supporter.SupporterId}" : fullName;
    }

    private static Dictionary<string, object?> CreateRow(params (string Key, object? Value)[] values)
    {
        var row = new Dictionary<string, object?>(values.Length, StringComparer.Ordinal);
        foreach (var (key, value) in values)
            row[key] = value;

        return row;
    }

    private static DateTime MaxGeneratedAt(DateTime? left, DateTime? right) =>
        left.HasValue && right.HasValue
            ? left.Value >= right.Value ? left.Value : right.Value
            : left ?? right ?? DateTime.UtcNow;

    private static string NormalizeJobKey(string jobKey) => jobKey.Trim().ToLowerInvariant();

    private static int? GetPostId(PredictionResult prediction)
    {
        if (TryGetMetadataInt(prediction.FeatureImportanceJson, "postId", out var postId))
            return postId;

        if (!string.IsNullOrWhiteSpace(prediction.Label) &&
            prediction.Label.StartsWith("PostId:", StringComparison.OrdinalIgnoreCase) &&
            int.TryParse(prediction.Label["PostId:".Length..], out postId))
        {
            return postId;
        }

        return null;
    }

    private static decimal? GetPredictedAmountPhp(PredictionResult prediction)
    {
        if (TryGetMetadataDecimal(prediction.FeatureImportanceJson, "predictedAmountPhp", out var amount))
            return amount;

        return null;
    }

    private static bool TryGetMetadataInt(string? json, string propertyName, out int value)
    {
        value = default;
        if (string.IsNullOrWhiteSpace(json))
            return false;

        try
        {
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty(propertyName, out var property))
                return false;

            if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out value))
                return true;

            if (property.ValueKind == JsonValueKind.String && int.TryParse(property.GetString(), out value))
                return true;
        }
        catch (JsonException)
        {
            return false;
        }

        return false;
    }

    private static bool TryGetMetadataDecimal(string? json, string propertyName, out decimal value)
    {
        value = default;
        if (string.IsNullOrWhiteSpace(json))
            return false;

        try
        {
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty(propertyName, out var property))
                return false;

            if (property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out value))
                return true;

            if (property.ValueKind == JsonValueKind.Number && property.TryGetDouble(out var number))
            {
                value = (decimal)number;
                return true;
            }

            if (property.ValueKind == JsonValueKind.String && decimal.TryParse(property.GetString(), out value))
                return true;
        }
        catch (JsonException)
        {
            return false;
        }

        return false;
    }

    private sealed record ReportRow(
        double SortPrimary,
        double SortSecondary,
        DateTime GeneratedAt,
        Dictionary<string, object?> Values);
}
