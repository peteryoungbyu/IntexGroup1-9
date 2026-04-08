namespace Intex.API.Services;

public record DonorUpsellInferenceResult(
    bool Success,
    int UpdatedCount,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string Message,
    string Error
);

public interface IDonorUpsellService
{
    Task<DonorUpsellInferenceResult> RunAsync(CancellationToken cancellationToken = default);
}
