using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Intex.API.Services;

public class DonorUpsellOptions
{
    public string ModelPath { get; set; } = "ml-runtime/donor_upsell_model.onnx";
    public float Threshold { get; set; } = 0.30f;
}

public class DonorUpsellService : IDonorUpsellService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<DonorUpsellService> _logger;
    private readonly DonorUpsellOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;

    private static readonly string[] NumericFeatures =
    [
        "days_since_first_gift", "recency_days", "lifetime_gift_count",
        "gift_count_365", "gift_count_180", "gift_count_90",
        "lifetime_value_prior", "avg_gift_lifetime", "avg_gift_365", "avg_gift_180", "avg_gift_90",
        "max_gift_prior", "last_gift_value", "prev_gift_value", "gift_growth_last_vs_prev",
        "avg_gap_days", "std_gap_days", "last_gap_days",
        "recurring_rate_365", "campaign_diversity_365", "channel_diversity_365",
        "share_social_channel_365", "share_campaign_channel_365",
        "recent_post_referrals_365",
        "avg_referred_post_engagement_365", "avg_referred_post_clicks_365",
        "avg_referred_post_donation_referrals_365", "boosted_referral_share_365",
        "supporter_tenure_days",
    ];

    private static readonly string[] CategoricalFeatures =
    [
        "supporter_type", "relationship_type", "region", "country", "status", "acquisition_channel",
    ];

    public DonorUpsellService(
        IWebHostEnvironment environment,
        IOptions<DonorUpsellOptions> options,
        ILogger<DonorUpsellService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _environment = environment;
        _options = options.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<DonorUpsellInferenceResult> RunAsync(CancellationToken cancellationToken = default)
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

            var supporters = await db.Supporters.AsNoTracking().ToListAsync(cancellationToken);
            var donations = await db.Donations.AsNoTracking().ToListAsync(cancellationToken);
            var socialPosts = await db.SocialMediaPosts.AsNoTracking().ToListAsync(cancellationToken);

            var postById = socialPosts.ToDictionary(p => p.PostId);
            var donationsBySupporter = donations
                .GroupBy(d => d.SupporterId)
                .ToDictionary(g => g.Key, g => g.OrderBy(d => d.DonationDate).ToList());

            var rows = BuildFeatureRows(supporters, donationsBySupporter, postById, anchor);

            if (rows.Count == 0)
                return new DonorUpsellInferenceResult(true, 0, startedAt, DateTimeOffset.UtcNow, "No eligible supporters.", string.Empty);

            var predictions = RunOnnxInference(modelPath, rows);

            // Replace today's predictions for this model
            var existingToday = await db.PredictionResults
                .Where(p => p.ModelName == "donor_upsell" && p.GeneratedAt >= DateTime.UtcNow.Date)
                .ToListAsync(cancellationToken);
            db.PredictionResults.RemoveRange(existingToday);

            var newResults = predictions.Select(p => new PredictionResult
            {
                SupporterId = p.SupporterId,
                ModelName = "donor_upsell",
                Score = (decimal)Math.Round(p.Probability, 3),
                Label = p.Probability >= _options.Threshold ? "WillUpgrade" : "WillNotUpgrade",
                GeneratedAt = DateTime.UtcNow,
            }).ToList();

            db.PredictionResults.AddRange(newResults);
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Donor upsell inference complete. Updated: {Count}", newResults.Count);
            return new DonorUpsellInferenceResult(true, newResults.Count, startedAt, DateTimeOffset.UtcNow,
                $"Wrote {newResults.Count} predictions.", string.Empty);
        }
        catch (TypeInitializationException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime type initialization failed during donor upsell inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new DonorUpsellInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (DllNotFoundException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime native dependency load failed during donor upsell inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new DonorUpsellInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (BadImageFormatException ex)
        {
            var details = OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex);
            _logger.LogError(
                ex,
                "ONNX runtime architecture mismatch or invalid native image during donor upsell inference. Details: {Details}. Diagnostics: {Diagnostics}",
                details,
                OnnxRuntimeDiagnostics.GetRuntimeDiagnostics());
            return new DonorUpsellInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, details);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Donor upsell inference failed.");
            return new DonorUpsellInferenceResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, ex.Message);
        }
    }

    private List<UpsellFeatureRow> BuildFeatureRows(
        List<Supporter> supporters,
        Dictionary<int, List<Donation>> donationsBySupporter,
        Dictionary<int, SocialMediaPost> postById,
        DateOnly anchor)
    {
        var rows = new List<UpsellFeatureRow>();

        foreach (var supporter in supporters)
        {
            if (!donationsBySupporter.TryGetValue(supporter.SupporterId, out var allDonations)) continue;
            if (allDonations.Count == 0) continue;

            var sortedDonations = allDonations.OrderBy(d => d.DonationDate).ToList();
            var lastDonation = sortedDonations.Last();
            var firstDonation = sortedDonations.First();

            double daysSinceFirstGift = (anchor.DayNumber - firstDonation.DonationDate.DayNumber);
            double recencyDays = (anchor.DayNumber - lastDonation.DonationDate.DayNumber);
            double supporterTenureDays = (anchor.DayNumber - DateOnly.FromDateTime(supporter.CreatedAt).DayNumber);

            int lifetimeGiftCount = sortedDonations.Count;
            double lifetimeValuePrior = sortedDonations.Sum(d => (double)(d.Amount ?? 0));
            double avgGiftLifetime = lifetimeValuePrior / Math.Max(lifetimeGiftCount, 1);
            double maxGiftPrior = (double)sortedDonations.Max(d => d.Amount ?? 0);
            double lastGiftValue = (double)(lastDonation.Amount ?? 0);
            double prevGiftValue = sortedDonations.Count >= 2
                ? (double)(sortedDonations[sortedDonations.Count - 2].Amount ?? 0)
                : double.NaN;
            double giftGrowthLastVsPrev = !double.IsNaN(prevGiftValue) && prevGiftValue > 1e-6
                ? (lastGiftValue - prevGiftValue) / prevGiftValue
                : double.NaN;

            var d365 = sortedDonations.Where(d => d.DonationDate > anchor.AddDays(-365)).ToList();
            var d180 = sortedDonations.Where(d => d.DonationDate > anchor.AddDays(-180)).ToList();
            var d90 = sortedDonations.Where(d => d.DonationDate > anchor.AddDays(-90)).ToList();

            int giftCount365 = d365.Count;
            int giftCount180 = d180.Count;
            int giftCount90 = d90.Count;

            double avgGift365 = d365.Count > 0 ? d365.Average(d => (double)(d.Amount ?? 0)) : double.NaN;
            double avgGift180 = d180.Count > 0 ? d180.Average(d => (double)(d.Amount ?? 0)) : double.NaN;
            double avgGift90 = d90.Count > 0 ? d90.Average(d => (double)(d.Amount ?? 0)) : double.NaN;

            var dates = sortedDonations.Select(d => d.DonationDate).ToList();
            var gaps = dates.Zip(dates.Skip(1), (a, b) => (double)(b.DayNumber - a.DayNumber)).ToList();
            double avgGapDays = gaps.Count > 0 ? gaps.Average() : double.NaN;
            double stdGapDays = gaps.Count > 1 ? Std(gaps) : double.NaN;
            double lastGapDays = gaps.Count > 0 ? gaps.Last() : double.NaN;

            double recurringRate365 = d365.Count > 0 ? d365.Average(d => d.IsRecurring ? 1.0 : 0.0) : double.NaN;
            int campaignDiversity365 = d365.Where(d => d.CampaignName != null).Select(d => d.CampaignName).Distinct().Count();
            int channelDiversity365 = d365.Where(d => d.ChannelSource != null).Select(d => d.ChannelSource).Distinct().Count();

            var socialDonations365 = d365.Where(d => d.ChannelSource == "SocialMedia").ToList();
            double shareSocial365 = d365.Count > 0 ? socialDonations365.Count / (double)d365.Count : double.NaN;
            var campaignDonations365 = d365.Where(d => d.ChannelSource == "Campaign").ToList();
            double shareCampaign365 = d365.Count > 0 ? campaignDonations365.Count / (double)d365.Count : double.NaN;

            var referralDonations365 = d365.Where(d => d.ReferralPostId.HasValue).ToList();
            int recentPostReferrals365 = referralDonations365.Count;

            var referredPosts365 = referralDonations365
                .Where(d => d.ReferralPostId.HasValue && postById.ContainsKey(d.ReferralPostId.Value))
                .Select(d => postById[d.ReferralPostId!.Value])
                .ToList();

            double avgReferredEngagement = referredPosts365.Count > 0
                ? referredPosts365.Average(p => (double)p.EngagementRate) : double.NaN;
            double avgReferredClicks = referredPosts365.Count > 0
                ? referredPosts365.Average(p => (double)p.ClickThroughs) : double.NaN;
            double avgReferredDonationReferrals = referredPosts365.Count > 0
                ? referredPosts365.Average(p => (double)p.DonationReferrals) : double.NaN;
            double boostedReferralShare = referredPosts365.Count > 0
                ? referredPosts365.Average(p => p.IsBoosted ? 1.0 : 0.0) : double.NaN;

            var numeric = new Dictionary<string, float>
            {
                ["days_since_first_gift"] = (float)daysSinceFirstGift,
                ["recency_days"] = (float)recencyDays,
                ["lifetime_gift_count"] = (float)lifetimeGiftCount,
                ["gift_count_365"] = (float)giftCount365,
                ["gift_count_180"] = (float)giftCount180,
                ["gift_count_90"] = (float)giftCount90,
                ["lifetime_value_prior"] = (float)lifetimeValuePrior,
                ["avg_gift_lifetime"] = (float)avgGiftLifetime,
                ["avg_gift_365"] = ToF(avgGift365),
                ["avg_gift_180"] = ToF(avgGift180),
                ["avg_gift_90"] = ToF(avgGift90),
                ["max_gift_prior"] = (float)maxGiftPrior,
                ["last_gift_value"] = (float)lastGiftValue,
                ["prev_gift_value"] = ToF(prevGiftValue),
                ["gift_growth_last_vs_prev"] = ToF(giftGrowthLastVsPrev),
                ["avg_gap_days"] = ToF(avgGapDays),
                ["std_gap_days"] = ToF(stdGapDays),
                ["last_gap_days"] = ToF(lastGapDays),
                ["recurring_rate_365"] = ToF(recurringRate365),
                ["campaign_diversity_365"] = (float)campaignDiversity365,
                ["channel_diversity_365"] = (float)channelDiversity365,
                ["share_social_channel_365"] = ToF(shareSocial365),
                ["share_campaign_channel_365"] = ToF(shareCampaign365),
                ["recent_post_referrals_365"] = (float)recentPostReferrals365,
                ["avg_referred_post_engagement_365"] = ToF(avgReferredEngagement),
                ["avg_referred_post_clicks_365"] = ToF(avgReferredClicks),
                ["avg_referred_post_donation_referrals_365"] = ToF(avgReferredDonationReferrals),
                ["boosted_referral_share_365"] = ToF(boostedReferralShare),
                ["supporter_tenure_days"] = (float)supporterTenureDays,
            };

            var categorical = new Dictionary<string, string>
            {
                ["supporter_type"] = supporter.SupporterType ?? "missing",
                ["relationship_type"] = supporter.RelationshipType ?? "missing",
                ["region"] = supporter.Region ?? "missing",
                ["country"] = supporter.Country ?? "missing",
                ["status"] = supporter.Status ?? "missing",
                ["acquisition_channel"] = supporter.AcquisitionChannel ?? "missing",
            };

            rows.Add(new UpsellFeatureRow { SupporterId = supporter.SupporterId, Numeric = numeric, Categorical = categorical });
        }

        return rows;
    }

    private List<(int SupporterId, float Probability)> RunOnnxInference(string modelPath, List<UpsellFeatureRow> rows)
    {
        try
        {
            using var session = OnnxRuntimeDiagnostics.CreateCpuOnlySession(modelPath, _logger, "DonorUpsell");
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
                .Select(i => (rows[i].SupporterId, probOutput[i, 1]))
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

    private static double Std(List<double> values)
    {
        double mean = values.Average();
        return Math.Sqrt(values.Sum(v => (v - mean) * (v - mean)) / values.Count);
    }

    private sealed class UpsellFeatureRow
    {
        public int SupporterId { get; init; }
        public Dictionary<string, float> Numeric { get; init; } = [];
        public Dictionary<string, string> Categorical { get; init; } = [];
    }
}
