namespace Intex.API.Models;

public class CaseConference
{
    public int ConferenceId { get; set; }
    public int ResidentId { get; set; }
    public DateOnly ConferenceDate { get; set; }
    public string FacilitatedBy { get; set; } = string.Empty;
    public string Attendees { get; set; } = string.Empty;
    public string Agenda { get; set; } = string.Empty;
    public string? Decisions { get; set; }
    public string? NextSteps { get; set; }
    public DateOnly? NextReviewDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Resident Resident { get; set; } = null!;
}
