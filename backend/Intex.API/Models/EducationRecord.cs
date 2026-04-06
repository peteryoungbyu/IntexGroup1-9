namespace Intex.API.Models;

public class EducationRecord
{
    public int EducationRecordId { get; set; }
    public int ResidentId { get; set; }
    public DateOnly RecordDate { get; set; }
    public string ProgramName { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public string EducationLevel { get; set; } = string.Empty;
    public string AttendanceStatus { get; set; } = string.Empty;
    public decimal AttendanceRate { get; set; }
    public decimal ProgressPercent { get; set; }
    public string CompletionStatus { get; set; } = "NotStarted";
    public decimal GpaLikeScore { get; set; }
    public string? Notes { get; set; }

    public Resident Resident { get; set; } = null!;
}
