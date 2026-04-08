namespace Intex.API.Services;

public record InterventionEffectivenessResult(
    bool Success,
    int UpdatedCount,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string Message,
    string Error
);

public interface IInterventionEffectivenessService
{
    Task<InterventionEffectivenessResult> RunAsync(CancellationToken cancellationToken = default);
}
