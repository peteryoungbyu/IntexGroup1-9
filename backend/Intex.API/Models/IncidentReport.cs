namespace Intex.API.Models;

public class IncidentReport
{
    public int IncidentId { get; set; }
    public int ResidentId { get; set; }
    public int SafehouseId { get; set; }
    public DateOnly IncidentDate { get; set; }
    public string IncidentType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ResponseTaken { get; set; }
    public bool Resolved { get; set; }
    public DateOnly? ResolutionDate { get; set; }
    public string ReportedBy { get; set; } = string.Empty;
    public bool FollowUpRequired { get; set; }

    public Resident Resident { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
}
