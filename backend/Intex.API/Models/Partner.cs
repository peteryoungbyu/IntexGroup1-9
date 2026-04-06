namespace Intex.API.Models;

public class Partner
{
    public int PartnerId { get; set; }
    public string PartnerName { get; set; } = string.Empty;
    public string PartnerType { get; set; } = string.Empty;
    public string RoleType { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Region { get; set; }
    public string Status { get; set; } = "Active";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }

    public ICollection<PartnerAssignment> Assignments { get; set; } = [];
    public ICollection<Donation> ReferredDonations { get; set; } = [];
}
