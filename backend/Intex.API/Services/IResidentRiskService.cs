namespace Intex.API.Services;

public record ResidentRiskResult(
    bool Success,
    int UpdatedCount,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string Message,
    string Error
);

public interface IResidentRiskService
{
    Task<ResidentRiskResult> RunAsync(CancellationToken cancellationToken = default);
}
