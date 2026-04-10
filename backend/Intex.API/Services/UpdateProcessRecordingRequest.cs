namespace Intex.API.Services;

public sealed class UpdateProcessRecordingRequest
{
    public DateOnly SessionDate { get; set; }
    public string SocialWorker { get; set; } = string.Empty;
    public string SessionType { get; set; } = string.Empty;
    public int SessionDurationMinutes { get; set; }
    public string? EmotionalStateObserved { get; set; }
    public string? EmotionalStateEnd { get; set; }
    public string? SessionNarrative { get; set; }
    public string? InterventionsApplied { get; set; }
    public string? FollowUpActions { get; set; }
    public bool ProgressNoted { get; set; }
    public bool ConcernsFlagged { get; set; }
    public bool ReferralMade { get; set; }
}
