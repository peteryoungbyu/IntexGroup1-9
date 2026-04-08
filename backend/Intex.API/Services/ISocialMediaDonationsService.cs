namespace Intex.API.Services;

public record SocialMediaDonationsResult(
    bool Success,
    int UpdatedCount,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset FinishedAtUtc,
    string Message,
    string Error
);

public interface ISocialMediaDonationsService
{
    Task<SocialMediaDonationsResult> RunAsync(CancellationToken cancellationToken = default);
}
