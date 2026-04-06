namespace Intex.API.Models;

public class InterventionPlan
{
    public int PlanId { get; set; }
    public int ResidentId { get; set; }
    public string PlanCategory { get; set; } = string.Empty;
    public string PlanDescription { get; set; } = string.Empty;
    public string? ServicesProvided { get; set; }
    public decimal? TargetValue { get; set; }
    public DateOnly? TargetDate { get; set; }
    public string Status { get; set; } = "Open";
    public DateOnly? CaseConferenceDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Resident Resident { get; set; } = null!;
}
