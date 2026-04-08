namespace Intex.API.Models;

public class Supporter
{
    public int SupporterId { get; set; }
    public string SupporterType { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? RelationshipType { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Status { get; set; } = "Active";
    public DateOnly? FirstDonationDate { get; set; }
    public string? AcquisitionChannel { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public decimal? ChurnProbability { get; set; }
    public bool? LikelyChurn { get; set; }

    public ICollection<Donation> Donations { get; set; } = [];
    public ICollection<SupporterUserLink> UserLinks { get; set; } = [];
}
