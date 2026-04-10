using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Intex.API.Models;

public class HomeVisitation
{
    [Key]
    public int VisitationId { get; set; }

    [Required]
    public int ResidentId { get; set; }

    [Required]
    public DateOnly VisitDate { get; set; }

    [Required]
    public string SocialWorker { get; set; } = string.Empty;

    [Required]
    public string VisitType { get; set; } = string.Empty;

    [Required] // Matches SQL NOT NULL
    public string LocationVisited { get; set; } = string.Empty;

    public string? FamilyMembersPresent { get; set; }
    public string? Purpose { get; set; }
    public string? Observations { get; set; }

    [Required] // Matches SQL NOT NULL
    public string FamilyCooperationLevel { get; set; } = string.Empty;

    public bool SafetyConcernsNoted { get; set; }
    public bool FollowUpNeeded { get; set; }
    public string? FollowUpNotes { get; set; }

    [Required] // Matches SQL NOT NULL
    public string VisitOutcome { get; set; } = string.Empty;

    // The Fix: Prevent the validator from requiring the full Resident object in the POST body
    [JsonIgnore] 
    public Resident? Resident { get; set; } 
}
