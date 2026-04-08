using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Intex.API.Services;

public class DonorChurnInferenceOptions
{
    public string ModelPath { get; set; } = "ml-runtime/donor_churn.onnx";
    public float Threshold { get; set; } = 0.49f;
    public int MinHistoryDays { get; set; } = 30;
}

public class DonorChurnInferenceService : IDonorChurnInferenceService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<DonorChurnInferenceService> _logger;
    private readonly DonorChurnInferenceOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;

    // Numeric feature names in order (43 features)
    private static readonly string[] NumericFeatures =
    [
        "recency_days", "tenure_days", "n_donations_total", "amount_total",
        "amount_mean", "amount_median", "amount_std", "amount_cv", "amount_max", "amount_min",
        "donations_last_30d", "donations_last_90d", "donations_last_180d", "donations_last_365d",
        "amount_last_30d", "amount_last_90d", "amount_last_180d", "amount_last_365d",
        "donation_count_trend_180", "amount_trend_180", "donation_count_trend_365", "amount_trend_365",
        "recent_avg_amount_90", "recent_avg_amount_180", "overall_avg_amount",
        "avg_amount_ratio_180_to_overall", "avg_amount_ratio_90_to_overall",
        "days_between_mean", "days_between_std", "days_between_cv",
        "donations_per_30d", "avg_days_between_proxy", "is_recurring_share",
        "recency_to_tenure_ratio", "share_donations_last_180d", "share_amount_last_180d",
        "share_donations_last_365d", "share_amount_last_365d",
        "campaign_nunique", "channel_nunique", "used_referral_share",
        "supporter_age_days_at_reference", "days_to_first_donation",
    ];

    // Categorical feature names in order (8 features)
    private static readonly string[] CategoricalFeatures =
    [
        "donation_type_mode", "channel_source_mode",
        "supporter_type", "relationship_type", "region", "country", "status", "acquisition_channel",
    ];

    // Full feature order as the ONNX model expects inputs (51 total)
    private static readonly string[] AllFeatures =
    [
        "recency_days", "tenure_days", "n_donations_total", "amount_total",
        "amount_mean", "amount_median", "amount_std", "amount_cv", "amount_max", "amount_min",
        "donations_last_30d", "donations_last_90d", "donations_last_180d", "donations_last_365d",
        "amount_last_30d", "amount_last_90d", "amount_last_180d", "amount_last_365d",
        "donation_count_trend_180", "amount_trend_180", "donation_count_trend_365", "amount_trend_365",
        "recent_avg_amount_90", "recent_avg_amount_180", "overall_avg_amount",
        "avg_amount_ratio_180_to_overall", "avg_amount_ratio_90_to_overall",
        "days_between_mean", "days_between_std", "days_between_cv",
        "donations_per_30d", "avg_days_between_proxy", "is_recurring_share",
        "recency_to_tenure_ratio", "share_donations_last_180d", "share_amount_last_180d",
        "share_donations_last_365d", "share_amount_last_365d",
        "campaign_nunique", "channel_nunique", "used_referral_share",
        "donation_type_mode", "channel_source_mode",
        "supporter_type", "relationship_type", "region", "country", "status", "acquisition_channel",
        "supporter_age_days_at_reference", "days_to_first_donation",
    ];

    public DonorChurnInferenceService(
        IWebHostEnvironment environment,
        IOptions<DonorChurnInferenceOptions> options,
        ILogger<DonorChurnInferenceService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _environment = environment;
        _logger = logger;
        _options = options.Value;
        _scopeFactory = scopeFactory;
    }

    public async Task<DonorChurnRunResult> RunAsync(
        DonorChurnRunRequest request,
        CancellationToken cancellationToken = default)
    {
        var startedAt = DateTimeOffset.UtcNow;

        try
        {
            var modelPath = Path.IsPathRooted(_options.ModelPath)
                ? _options.ModelPath
                : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, _options.ModelPath));

            if (!File.Exists(modelPath))
                throw new FileNotFoundException($"ONNX model not found: {modelPath}");

            var asOfDate = string.IsNullOrWhiteSpace(request.AsOfDate)
                ? DateOnly.FromDateTime(DateTime.UtcNow)
                : DateOnly.Parse(request.AsOfDate);

            var referenceDate = new DateOnly(2025, 9, 1);

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var supporters = await db.Supporters
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var donations = await db.Donations
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var donationsBySupporter = donations
                .GroupBy(d => d.SupporterId)
                .ToDictionary(g => g.Key, g => g.OrderBy(d => d.DonationDate).ToList());

            var rows = BuildFeatureRows(supporters, donationsBySupporter, asOfDate, referenceDate);

            if (rows.Count == 0)
            {
                _logger.LogWarning("No eligible supporter rows found for inference.");
                return new DonorChurnRunResult(
                    Success: true,
                    ExitCode: 0,
                    StartedAtUtc: startedAt,
                    FinishedAtUtc: DateTimeOffset.UtcNow,
                    StandardOutput: "No eligible supporters found.",
                    StandardError: string.Empty);
            }

            var predictions = RunOnnxInference(modelPath, rows);

            // Write predictions back to DB
            var supporterIds = predictions.Select(p => p.SupporterId).ToHashSet();
            var toUpdate = await db.Supporters
                .Where(s => supporterIds.Contains(s.SupporterId))
                .ToListAsync(cancellationToken);

            var predMap = predictions.ToDictionary(p => p.SupporterId);
            foreach (var s in toUpdate)
            {
                if (!predMap.TryGetValue(s.SupporterId, out var pred)) continue;
                s.ChurnProbability = (decimal)Math.Round(pred.Probability, 3);
                s.LikelyChurn = pred.LikelyChurn;
            }

            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Churn inference complete. As-of: {AsOfDate}, Threshold: {Threshold}, Updated: {Count}",
                asOfDate, _options.Threshold, toUpdate.Count);

            return new DonorChurnRunResult(
                Success: true,
                ExitCode: 0,
                StartedAtUtc: startedAt,
                FinishedAtUtc: DateTimeOffset.UtcNow,
                StandardOutput: $"Updated {toUpdate.Count} supporters. As-of: {asOfDate}",
                StandardError: string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Donor churn inference failed.");
            return new DonorChurnRunResult(
                Success: false,
                ExitCode: 1,
                StartedAtUtc: startedAt,
                FinishedAtUtc: DateTimeOffset.UtcNow,
                StandardOutput: string.Empty,
                StandardError: ex.Message);
        }
    }

    private List<FeatureRow> BuildFeatureRows(
        List<Supporter> supporters,
        Dictionary<int, List<Donation>> donationsBySupporter,
        DateOnly asOfDate,
        DateOnly referenceDate)
    {
        var supporterMap = supporters.ToDictionary(s => s.SupporterId);
        var rows = new List<FeatureRow>();

        foreach (var (supporterId, allDonations) in donationsBySupporter)
        {
            if (!supporterMap.TryGetValue(supporterId, out var supporter)) continue;

            var past = allDonations.Where(d => d.DonationDate <= asOfDate).ToList();
            if (past.Count == 0) continue;

            var firstDonation = past.Min(d => d.DonationDate);
            if ((asOfDate.DayNumber - firstDonation.DayNumber) < _options.MinHistoryDays) continue;

            var sortedDates = past.Select(d => d.DonationDate).Order().ToList();
            var lastDonation = sortedDates.Last();

            var amounts = past.Select(d => (double)(d.Amount ?? 0m)).ToList();

            var recent30 = past.Where(d => d.DonationDate > asOfDate.AddDays(-30)).ToList();
            var recent90 = past.Where(d => d.DonationDate > asOfDate.AddDays(-90)).ToList();
            var recent180 = past.Where(d => d.DonationDate > asOfDate.AddDays(-180)).ToList();
            var recent365 = past.Where(d => d.DonationDate > asOfDate.AddDays(-365)).ToList();
            var prev180 = past.Where(d => d.DonationDate <= asOfDate.AddDays(-180) && d.DonationDate > asOfDate.AddDays(-360)).ToList();
            var prev365 = past.Where(d => d.DonationDate <= asOfDate.AddDays(-365) && d.DonationDate > asOfDate.AddDays(-730)).ToList();

            double amt30 = recent30.Sum(d => (double)(d.Amount ?? 0m));
            double amt90 = recent90.Sum(d => (double)(d.Amount ?? 0m));
            double amt180 = recent180.Sum(d => (double)(d.Amount ?? 0m));
            double amt365 = recent365.Sum(d => (double)(d.Amount ?? 0m));
            double amtPrev180 = prev180.Sum(d => (double)(d.Amount ?? 0m));
            double amtPrev365 = prev365.Sum(d => (double)(d.Amount ?? 0m));

            int cnt30 = recent30.Count, cnt90 = recent90.Count;
            int cnt180 = recent180.Count, cnt365 = recent365.Count;
            int cntPrev180 = prev180.Count, cntPrev365 = prev365.Count;

            int nTotal = past.Count;
            double amtTotal = amounts.Sum();
            double amtMean = amounts.Average();
            double amtMedian = Median(amounts);
            double amtStd = Std(amounts);
            double amtMax = amounts.Max();
            double amtMin = amounts.Min();
            double amtCv = amtStd / Math.Max(amtMean, 1e-6);

            double overallAvg = amtTotal / Math.Max(nTotal, 1);
            double recentAvg90 = amt90 / Math.Max(cnt90, 1);
            double recentAvg180 = amt180 / Math.Max(cnt180, 1);

            int tenureDays = Math.Max((asOfDate.DayNumber - sortedDates.First().DayNumber), 1);
            int recencyDays = asOfDate.DayNumber - lastDonation.DayNumber;

            var gaps = sortedDates
                .Zip(sortedDates.Skip(1), (a, b) => (double)(b.DayNumber - a.DayNumber))
                .ToList();

            double avgGap = gaps.Count > 0 ? gaps.Average() : double.NaN;
            double stdGap = gaps.Count > 1 ? Std(gaps) : double.NaN;
            double cvGap = (!double.IsNaN(avgGap) && !double.IsNaN(stdGap))
                ? stdGap / Math.Max(avgGap, 1e-6)
                : double.NaN;

            string donationTypeMode = ModeString(past.Select(d => d.DonationType));
            string channelSourceMode = ModeString(past.Where(d => d.ChannelSource != null).Select(d => d.ChannelSource!));

            int supporterAgeDays = referenceDate.DayNumber - DateOnly.FromDateTime(supporter.CreatedAt).DayNumber;
            double daysToFirstDonation = supporter.FirstDonationDate.HasValue
                ? (supporter.FirstDonationDate.Value.DayNumber - DateOnly.FromDateTime(supporter.CreatedAt).DayNumber)
                : double.NaN;

            var row = new FeatureRow
            {
                SupporterId = supporterId,
                Numeric = new Dictionary<string, float>
                {
                    ["recency_days"] = (float)recencyDays,
                    ["tenure_days"] = (float)tenureDays,
                    ["n_donations_total"] = (float)nTotal,
                    ["amount_total"] = (float)amtTotal,
                    ["amount_mean"] = (float)amtMean,
                    ["amount_median"] = (float)amtMedian,
                    ["amount_std"] = (float)amtStd,
                    ["amount_cv"] = (float)amtCv,
                    ["amount_max"] = (float)amtMax,
                    ["amount_min"] = (float)amtMin,
                    ["donations_last_30d"] = (float)cnt30,
                    ["donations_last_90d"] = (float)cnt90,
                    ["donations_last_180d"] = (float)cnt180,
                    ["donations_last_365d"] = (float)cnt365,
                    ["amount_last_30d"] = (float)amt30,
                    ["amount_last_90d"] = (float)amt90,
                    ["amount_last_180d"] = (float)amt180,
                    ["amount_last_365d"] = (float)amt365,
                    ["donation_count_trend_180"] = (float)(cnt180 - cntPrev180),
                    ["amount_trend_180"] = (float)(amt180 - amtPrev180),
                    ["donation_count_trend_365"] = (float)(cnt365 - cntPrev365),
                    ["amount_trend_365"] = (float)(amt365 - amtPrev365),
                    ["recent_avg_amount_90"] = (float)recentAvg90,
                    ["recent_avg_amount_180"] = (float)recentAvg180,
                    ["overall_avg_amount"] = (float)overallAvg,
                    ["avg_amount_ratio_180_to_overall"] = (float)(recentAvg180 / Math.Max(overallAvg, 1e-6)),
                    ["avg_amount_ratio_90_to_overall"] = (float)(recentAvg90 / Math.Max(overallAvg, 1e-6)),
                    ["days_between_mean"] = double.IsNaN(avgGap) ? float.NaN : (float)avgGap,
                    ["days_between_std"] = double.IsNaN(stdGap) ? float.NaN : (float)stdGap,
                    ["days_between_cv"] = double.IsNaN(cvGap) ? float.NaN : (float)cvGap,
                    ["donations_per_30d"] = (float)(nTotal / Math.Max(tenureDays / 30.0, 1e-6)),
                    ["avg_days_between_proxy"] = (float)(tenureDays / Math.Max(nTotal - 1, 1)),
                    ["is_recurring_share"] = (float)past.Average(d => d.IsRecurring ? 1.0 : 0.0),
                    ["recency_to_tenure_ratio"] = (float)(recencyDays / Math.Max(tenureDays, 1)),
                    ["share_donations_last_180d"] = (float)(cnt180 / Math.Max(nTotal, 1.0)),
                    ["share_amount_last_180d"] = (float)(amt180 / Math.Max(amtTotal, 1e-6)),
                    ["share_donations_last_365d"] = (float)(cnt365 / Math.Max(nTotal, 1.0)),
                    ["share_amount_last_365d"] = (float)(amt365 / Math.Max(amtTotal, 1e-6)),
                    ["campaign_nunique"] = (float)past.Where(d => d.CampaignName != null).Select(d => d.CampaignName).Distinct().Count(),
                    ["channel_nunique"] = (float)past.Where(d => d.ChannelSource != null).Select(d => d.ChannelSource).Distinct().Count(),
                    ["used_referral_share"] = (float)past.Average(d => d.ReferralPostId.HasValue ? 1.0 : 0.0),
                    ["supporter_age_days_at_reference"] = (float)supporterAgeDays,
                    ["days_to_first_donation"] = double.IsNaN(daysToFirstDonation) ? float.NaN : (float)daysToFirstDonation,
                },
                Categorical = new Dictionary<string, string>
                {
                    ["donation_type_mode"] = donationTypeMode,
                    ["channel_source_mode"] = channelSourceMode,
                    ["supporter_type"] = supporter.SupporterType ?? "missing",
                    ["relationship_type"] = supporter.RelationshipType ?? "missing",
                    ["region"] = supporter.Region ?? "missing",
                    ["country"] = supporter.Country ?? "missing",
                    ["status"] = supporter.Status ?? "missing",
                    ["acquisition_channel"] = supporter.AcquisitionChannel ?? "missing",
                },
            };

            rows.Add(row);
        }

        return rows;
    }

    private List<(int SupporterId, float Probability, bool LikelyChurn)> RunOnnxInference(
        string modelPath,
        List<FeatureRow> rows)
    {
        using var session = new InferenceSession(modelPath);

        var inputs = new List<NamedOnnxValue>();

        // Add numeric inputs — each is a column tensor of shape [n, 1]
        foreach (var feat in NumericFeatures)
        {
            var data = rows.Select(r => r.Numeric.TryGetValue(feat, out var v) ? v : float.NaN).ToArray();
            var tensor = new DenseTensor<float>(data, [rows.Count, 1]);
            inputs.Add(NamedOnnxValue.CreateFromTensor(feat, tensor));
        }

        // Add categorical inputs — each is a column tensor of shape [n, 1]
        foreach (var feat in CategoricalFeatures)
        {
            var data = rows.Select(r => r.Categorical.TryGetValue(feat, out var v) ? v : "missing").ToArray();
            var tensor = new DenseTensor<string>(data, [rows.Count, 1]);
            inputs.Add(NamedOnnxValue.CreateFromTensor(feat, tensor));
        }

        using var results = session.Run(inputs);

        // "probabilities" output: shape [n, 2] — column 1 is churn probability
        var probOutput = results.First(r => r.Name == "probabilities").AsTensor<float>();

        var predictions = new List<(int, float, bool)>();
        for (int i = 0; i < rows.Count; i++)
        {
            float prob = probOutput[i, 1];
            predictions.Add((rows[i].SupporterId, prob, prob >= _options.Threshold));
        }

        return predictions;
    }

    private static double Median(List<double> values)
    {
        if (values.Count == 0) return 0;
        var sorted = values.Order().ToArray();
        int mid = sorted.Length / 2;
        return sorted.Length % 2 == 0 ? (sorted[mid - 1] + sorted[mid]) / 2.0 : sorted[mid];
    }

    private static double Std(List<double> values)
    {
        if (values.Count <= 1) return 0;
        double mean = values.Average();
        return Math.Sqrt(values.Sum(v => (v - mean) * (v - mean)) / values.Count);
    }

    private static string ModeString(IEnumerable<string> values)
    {
        var list = values.ToList();
        if (list.Count == 0) return "Unknown";
        return list.GroupBy(v => v).OrderByDescending(g => g.Count()).First().Key;
    }

    private sealed class FeatureRow
    {
        public int SupporterId { get; init; }
        public Dictionary<string, float> Numeric { get; init; } = [];
        public Dictionary<string, string> Categorical { get; init; } = [];
    }
}
