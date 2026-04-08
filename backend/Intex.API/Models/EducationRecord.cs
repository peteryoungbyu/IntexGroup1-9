using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.API.Models;

public class EducationRecord
{
    public int EducationRecordId { get; set; }
    public int ResidentId { get; set; }
    public DateOnly RecordDate { get; set; }

    // Azure DB uses school_name and enrollment_status, not program_name/course_name/attendance_status/gpa_like_score
    [Column("school_name")]
    public string? SchoolName { get; set; }

    [Column("enrollment_status")]
    public string? EnrollmentStatus { get; set; }

    public string EducationLevel { get; set; } = string.Empty;
    public decimal AttendanceRate { get; set; }
    public decimal ProgressPercent { get; set; }
    public string CompletionStatus { get; set; } = "NotStarted";
    public string? Notes { get; set; }

    public Resident Resident { get; set; } = null!;
}
