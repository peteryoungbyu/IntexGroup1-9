namespace Intex.API.Services;

public record DonorChurnRunRequest(string? AsOfDate);

public record DonorChurnRunResult(
    bool Success,
    int ExitCode,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string StandardOutput,
    string StandardError
);

public interface IDonorChurnInferenceService
{
    Task<DonorChurnRunResult> RunAsync(DonorChurnRunRequest request, CancellationToken cancellationToken = default);
}
