using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using System.Text.Json;

namespace Intex.API.Services;

public class SocialMediaDonationsOptions
{
    public string ClassificationModelPath { get; set; } = "ml-runtime/social_media_donations_classification_model.onnx";
    public string RegressionModelPath { get; set; } = "ml-runtime/social_media_donations_regression_model.onnx";
    public float ClassificationThreshold { get; set; } = 0.2818f;
}

public class SocialMediaDonationsService : ISocialMediaDonationsService
{
    private const decimal MaxStoredScore = 99.9999m;
    private const decimal MaxStoredAmountPhp = 9999999999.99m;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SocialMediaDonationsService> _logger;
    private readonly SocialMediaDonationsOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;

    // Numeric features (27) — same for both models
    private static readonly string[] NumericFeatures =
    [
        "post_hour", "num_hashtags", "mentions_count", "has_call_to_action",
        "caption_length", "features_resident_story", "is_boosted", "boost_budget_php",
        "impressions", "reach", "likes", "comments", "shares", "saves", "click_throughs",
        "video_views", "engagement_rate", "profile_visits", "follower_count_at_post",
        "watch_time_seconds", "avg_view_duration_seconds", "subscriber_count_at_post", "forwards",
        "caption_length_calc", "num_words", "has_question", "has_link",
    ];

    // Categorical features (11) — same for both models
    private static readonly string[] CategoricalFeatures =
    [
        "platform", "created_at", "day_of_week", "post_type", "media_type",
        "caption", "hashtags", "call_to_action_type", "content_topic", "sentiment_tone", "campaign_name",
    ];

    public SocialMediaDonationsService(
        IWebHostEnvironment environment,
        IOptions<SocialMediaDonationsOptions> options,
        ILogger<SocialMediaDonationsService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _environment = environment;
        _options = options.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<SocialMediaDonationsResult> RunAsync(CancellationToken cancellationToken = default)
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

            var posts = await db.SocialMediaPosts.AsNoTracking().ToListAsync(cancellationToken);

            if (posts.Count == 0)
                return new SocialMediaDonationsResult(true, 0, startedAt, DateTimeOffset.UtcNow, "No posts found.", string.Empty);

            var rows = BuildFeatureRows(posts);

            var classPredictions = RunClassificationInference(classPath, rows);
            var regPredictions = RunRegressionInference(regPath, rows);

            // Remove today's predictions for both models
            var existingToday = await db.PredictionResults
                .Where(p => (p.ModelName == "social_media_classification" || p.ModelName == "social_media_regression")
                            && p.GeneratedAt >= DateTime.UtcNow.Date)
                .ToListAsync(cancellationToken);
            db.PredictionResults.RemoveRange(existingToday);

            var newResults = new List<PredictionResult>();
            for (int i = 0; i < rows.Count; i++)
            {
                float classProb = classPredictions[i];
                float regAmount = regPredictions[i]; // already exponentiated (PHP amount)
                decimal predictedAmount = ToStoredPredictedAmount(regAmount);

                newResults.Add(new PredictionResult
                {
                    ModelName = "social_media_classification",
                    Score = (decimal)Math.Round(classProb, 3),
                    Label = classProb >= _options.ClassificationThreshold ? "WillGenerateDonation" : "WillNotGenerateDonation",
                    GeneratedAt = DateTime.UtcNow,
                });
                newResults.Add(new PredictionResult
                {
                    ModelName = "social_media_regression",
                    // prediction_results.score is decimal(6,4); store a bounded monotonic rank score there
                    // and keep the real PHP amount in metadata for display/use.
                    Score = ToStoredRegressionScore(regAmount),
                    Label = $"PostId:{rows[i].PostId}",
                    FeatureImportanceJson = JsonSerializer.Serialize(new
                    {
                        postId = rows[i].PostId,
                        predictedAmountPhp = predictedAmount
                    }),
                    GeneratedAt = DateTime.UtcNow,
                });
            }

            db.PredictionResults.AddRange(newResults);
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Social media donations inference complete. Wrote {Count} predictions.", newResults.Count);
            return new SocialMediaDonationsResult(true, newResults.Count, startedAt, DateTimeOffset.UtcNow,
                $"Wrote {newResults.Count} predictions ({rows.Count} posts × 2 models).", string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Social media donations inference failed.");
            return new SocialMediaDonationsResult(false, 0, startedAt, DateTimeOffset.UtcNow, string.Empty, GetInnermostMessage(ex));
        }
    }

    private List<PostFeatureRow> BuildFeatureRows(List<SocialMediaPost> posts)
    {
        return posts.Select(p =>
        {
            string caption = p.Caption ?? "";
            int numWords = string.IsNullOrWhiteSpace(caption) ? 0 : caption.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
            bool hasQuestion = caption.Contains('?');
            bool hasLink = caption.Contains("http", StringComparison.OrdinalIgnoreCase)
                        || caption.Contains("www.", StringComparison.OrdinalIgnoreCase);

            var numeric = new Dictionary<string, float>
            {
                ["post_hour"] = p.PostHour.HasValue ? (float)p.PostHour.Value : 0f,
                ["num_hashtags"] = (float)p.NumHashtags,
                ["mentions_count"] = (float)p.MentionsCount,
                ["has_call_to_action"] = p.HasCallToAction ? 1f : 0f,
                ["caption_length"] = (float)p.CaptionLength,
                ["features_resident_story"] = p.FeaturesResidentStory ? 1f : 0f,
                ["is_boosted"] = p.IsBoosted ? 1f : 0f,
                ["boost_budget_php"] = p.BoostBudgetPhp.HasValue ? (float)p.BoostBudgetPhp.Value : 0f,
                ["impressions"] = (float)p.Impressions,
                ["reach"] = (float)p.Reach,
                ["likes"] = (float)p.Likes,
                ["comments"] = (float)p.Comments,
                ["shares"] = (float)p.Shares,
                ["saves"] = (float)p.Saves,
                ["click_throughs"] = (float)p.ClickThroughs,
                ["video_views"] = p.VideoViews.HasValue ? (float)p.VideoViews.Value : 0f,
                ["engagement_rate"] = (float)p.EngagementRate,
                ["profile_visits"] = (float)p.ProfileVisits,
                ["follower_count_at_post"] = (float)p.FollowerCountAtPost,
                ["watch_time_seconds"] = p.WatchTimeSeconds.HasValue ? (float)p.WatchTimeSeconds.Value : 0f,
                ["avg_view_duration_seconds"] = p.AvgViewDurationSeconds.HasValue ? (float)p.AvgViewDurationSeconds.Value : 0f,
                ["subscriber_count_at_post"] = p.SubscriberCountAtPost.HasValue ? (float)p.SubscriberCountAtPost.Value : 0f,
                ["forwards"] = p.Forwards.HasValue ? (float)p.Forwards.Value : 0f,
                ["caption_length_calc"] = (float)caption.Length,
                ["num_words"] = (float)numWords,
                ["has_question"] = hasQuestion ? 1f : 0f,
                ["has_link"] = hasLink ? 1f : 0f,
            };

            var categorical = new Dictionary<string, string>
            {
                ["platform"] = p.Platform ?? "missing",
                ["created_at"] = p.CreatedAt.ToString("yyyy-MM-dd"),
                ["day_of_week"] = p.DayOfWeek ?? "missing",
                ["post_type"] = p.PostType ?? "missing",
                ["media_type"] = p.MediaType ?? "missing",
                ["caption"] = caption.Length > 500 ? caption[..500] : caption,
                ["hashtags"] = p.Hashtags ?? "missing",
                ["call_to_action_type"] = p.CallToActionType ?? "missing",
                ["content_topic"] = p.ContentTopic ?? "missing",
                ["sentiment_tone"] = p.SentimentTone ?? "missing",
                ["campaign_name"] = p.CampaignName ?? "missing",
            };

            return new PostFeatureRow { PostId = p.PostId, Numeric = numeric, Categorical = categorical };
        }).ToList();
    }

    private float[] RunClassificationInference(string modelPath, List<PostFeatureRow> rows)
    {
        using var session = new InferenceSession(modelPath);
        var inputs = BuildInputs(rows);
        using var results = session.Run(inputs);
        var probOutput = results.First(r => r.Name == "probabilities").AsTensor<float>();
        return Enumerable.Range(0, rows.Count).Select(i => probOutput[i, 1]).ToArray();
    }

    private float[] RunRegressionInference(string modelPath, List<PostFeatureRow> rows)
    {
        using var session = new InferenceSession(modelPath);
        var inputs = BuildInputs(rows);
        using var results = session.Run(inputs);
        // Regression output is log-transformed amount — exponentiate to get PHP
        var output = results.First(r => r.Name == "variable").AsTensor<float>();
        return Enumerable.Range(0, rows.Count).Select(i => (float)Math.Exp(output[i])).ToArray();
    }

    private List<NamedOnnxValue> BuildInputs(List<PostFeatureRow> rows)
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

    private static decimal ToStoredRegressionScore(float regAmount)
    {
        var safeAmount = ToFiniteNonNegativeFloat(regAmount);
        var monotonicRank = (decimal)Math.Log10(1d + safeAmount);
        return decimal.Min(decimal.Round(monotonicRank, 4), MaxStoredScore);
    }

    private static decimal ToStoredPredictedAmount(float regAmount)
    {
        var safeAmount = ToFiniteNonNegativeFloat(regAmount);
        return decimal.Min(decimal.Round((decimal)safeAmount, 2), MaxStoredAmountPhp);
    }

    private static float ToFiniteNonNegativeFloat(float value) =>
        !float.IsFinite(value) || value < 0f ? 0f : value;

    private static string GetInnermostMessage(Exception ex)
    {
        while (ex.InnerException is not null)
            ex = ex.InnerException;

        return ex.Message;
    }

    private sealed class PostFeatureRow
    {
        public int PostId { get; init; }
        public Dictionary<string, float> Numeric { get; init; } = [];
        public Dictionary<string, string> Categorical { get; init; } = [];
    }
}
