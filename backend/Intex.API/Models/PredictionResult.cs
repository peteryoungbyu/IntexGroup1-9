namespace Intex.API.Models;

public class PredictionResult
{
    public int PredictionId { get; set; }
    public int? ResidentId { get; set; }
    public int? SupporterId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string? Label { get; set; }
    public string? FeatureImportanceJson { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public Resident? Resident { get; set; }
    public Supporter? Supporter { get; set; }
}
