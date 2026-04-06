namespace Intex.API.Models;

public class HealthWellbeingRecord
{
    public int HealthRecordId { get; set; }
    public int ResidentId { get; set; }
    public DateOnly RecordDate { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? Bmi { get; set; }
    public decimal? NutritionScore { get; set; }
    public decimal? SleepScore { get; set; }
    public decimal? EnergyScore { get; set; }
    public decimal? GeneralHealthScore { get; set; }
    public bool MedicalCheckupDone { get; set; }
    public bool DentalCheckupDone { get; set; }
    public bool PsychologicalCheckupDone { get; set; }
    public string? MedicalNotesRestricted { get; set; }

    public Resident Resident { get; set; } = null!;
}
