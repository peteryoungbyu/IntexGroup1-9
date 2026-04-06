namespace Intex.API.Models;

public class Safehouse
{
    public int SafehouseId { get; set; }
    public string SafehouseCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Country { get; set; } = "Philippines";
    public DateOnly OpenDate { get; set; }
    public string Status { get; set; } = "Active";
    public int CapacityGirls { get; set; }
    public int CapacityStaff { get; set; }
    public int CurrentOccupancy { get; set; }
    public string? Notes { get; set; }

    public ICollection<Resident> Residents { get; set; } = [];
    public ICollection<IncidentReport> IncidentReports { get; set; } = [];
    public ICollection<SafehouseMonthlyMetric> MonthlyMetrics { get; set; } = [];
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = [];
    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = [];
}
