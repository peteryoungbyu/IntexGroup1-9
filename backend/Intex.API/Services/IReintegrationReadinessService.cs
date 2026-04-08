namespace Intex.API.Services;

public record ReintegrationInferenceResult(
    bool Success,
    int UpdatedCount,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string Message,
    string Error
);

public interface IReintegrationReadinessService
{
    Task<ReintegrationInferenceResult> RunAsync(CancellationToken cancellationToken = default);
}
