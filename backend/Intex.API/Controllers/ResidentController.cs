using System.ComponentModel.DataAnnotations;
using Intex.API.Data;
using Intex.API.Models;
using Intex.API.Services;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class ResidentController : ControllerBase
{
    private static readonly string[] AllowedSessionTypes = ["Individual", "Group"];
    private static readonly string[] AllowedEmotionalStates = ["Calm", "Anxious", "Sad", "Angry", "Hopeful", "Withdrawn", "Happy", "Distressed"];
    private static readonly string[] AllowedInterventions = ["Legal Services", "Healing", "Teaching", "Caring"];

    private readonly IResidentService _service;
    private readonly AppDbContext _db;

    public ResidentController(IResidentService service, AppDbContext db)
    {
        _service = service;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 1000)] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseCategory = null)
        => Ok(await _service.GetAllAsync(page, pageSize, search, status, safehouseId, caseCategory));

    [HttpGet("filter-options")]
    public async Task<IActionResult> GetFilterOptions()
    {
        var safehouses = await _db.Safehouses
            .AsNoTracking()
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .ThenBy(s => s.SafehouseId)
            .Select(s => new ResidentSafehouseOption(s.SafehouseId, s.Name))
            .ToListAsync();

        return Ok(safehouses);
    }

    [HttpGet("form-options")]
    public async Task<IActionResult> GetFormOptions()
        => Ok(await _service.GetFormOptionsAsync());

    [HttpGet("recordings/form-options")]
    public async Task<IActionResult> GetRecordingFormOptions()
    {
        var residents = await _db.Residents
            .AsNoTracking()
            .OrderBy(r => r.CaseControlNo)
            .Select(r => new RecordingFormResidentOption(r.ResidentId, r.CaseControlNo))
            .ToListAsync();

        var socialWorkers = await _db.ProcessRecordings
            .AsNoTracking()
            .Select(r => r.SocialWorker)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct()
            .OrderBy(v => v)
            .ToListAsync();

        var emotionalStateObserved = await _db.ProcessRecordings
            .AsNoTracking()
            .Select(r => r.EmotionalStateObserved)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!)
            .Distinct()
            .OrderBy(v => v)
            .ToListAsync();

        var emotionalStateEnd = await _db.ProcessRecordings
            .AsNoTracking()
            .Select(r => r.EmotionalStateEnd)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!)
            .Distinct()
            .OrderBy(v => v)
            .ToListAsync();

        var followUpActions = await _db.ProcessRecordings
            .AsNoTracking()
            .Select(r => r.FollowUpActions)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!)
            .Distinct()
            .OrderBy(v => v)
            .ToListAsync();

        if (emotionalStateObserved.Count == 0)
            emotionalStateObserved = AllowedEmotionalStates.ToList();

        if (emotionalStateEnd.Count == 0)
            emotionalStateEnd = AllowedEmotionalStates.ToList();

        return Ok(new ProcessRecordingFormOptionsResponse(
            residents,
            socialWorkers,
            emotionalStateObserved,
            emotionalStateEnd,
            followUpActions));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] CreateResidentRequest request)
    {
        try
        {
            var created = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = created.ResidentId }, created);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateResidentRequest resident)
    {
        try
        {
            var result = await _service.UpdateAsync(id, resident);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                error = "Failed to update resident because one or more values conflict with existing data."
            });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                error = "Failed to delete resident because related records still exist in another table."
            });
        }
        catch (SqlException ex) when (ex.Number == 547)
        {
            return Conflict(new
            {
                error = "Failed to delete resident because related records still exist in another table."
            });
        }
    }

    // Process Recordings
    [HttpGet("{id:int}/recordings")]
    public async Task<IActionResult> GetRecordings(int id)
    {
        var recordings = await _db.ProcessRecordings
            .Where(r => r.ResidentId == id)
            .OrderByDescending(r => r.SessionDate)
            .ToListAsync();
        return Ok(recordings);
    }

    [HttpPost("{id:int}/recordings")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> AddRecording(int id, [FromBody] ProcessRecording recording)
    {
        recording.ResidentId = id;
        _db.ProcessRecordings.Add(recording);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
        }
        return CreatedAtAction(nameof(GetRecordings), new { id }, recording);
    }

    [HttpPost("{id:int}/recordings/session-entry")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> AddSessionEntryRecording(int id, [FromBody] SessionEntryRequest request)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        if (!AllowedSessionTypes.Contains(request.SessionType))
            return BadRequest("Session type must be Individual or Group.");

        if (!AllowedEmotionalStates.Contains(request.EmotionalStateObserved))
            return BadRequest("Invalid emotional state for start.");

        if (!AllowedEmotionalStates.Contains(request.EmotionalStateEnd))
            return BadRequest("Invalid emotional state for end.");

        if (request.SessionDurationMinutes <= 0)
            return BadRequest("Session duration must be greater than 0 minutes.");

        var selectedInterventions = request.InterventionsApplied
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v.Trim())
            .Distinct()
            .ToList();

        if (selectedInterventions.Count == 0)
            return BadRequest("At least one intervention must be selected.");

        if (selectedInterventions.Any(v => !AllowedInterventions.Contains(v)))
            return BadRequest("One or more interventions are invalid.");

        var nextRecordingId = (await _db.ProcessRecordings.MaxAsync(r => (int?)r.RecordingId) ?? 0) + 1;
        var sessionNarrative = $"Session with resident. Type: {request.SessionType}. Duration: {request.SessionDurationMinutes} minutes.";

        var recording = new ProcessRecording
        {
            RecordingId = nextRecordingId,
            ResidentId = id,
            SessionDate = request.SessionDate,
            SocialWorker = request.SocialWorker.Trim(),
            SessionType = request.SessionType,
            SessionDurationMinutes = request.SessionDurationMinutes,
            EmotionalStateObserved = request.EmotionalStateObserved,
            EmotionalStateEnd = request.EmotionalStateEnd,
            SessionNarrative = sessionNarrative,
            InterventionsApplied = string.Join(", ", selectedInterventions),
            FollowUpActions = request.FollowUpActions,
            ProgressNoted = request.ProgressNoted,
            ConcernsFlagged = request.ConcernsFlagged,
            ReferralMade = request.ReferralMade,
            NotesRestricted = null,
        };

        _db.ProcessRecordings.Add(recording);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRecordings), new { id }, recording);
    }

    [HttpDelete("{id:int}/recordings/{recordingId:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> DeleteRecording(int id, int recordingId)
    {
        var recording = await _db.ProcessRecordings.FindAsync(recordingId);
        if (recording is null || recording.ResidentId != id) return NotFound();
        _db.ProcessRecordings.Remove(recording);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Home Visitations
    [HttpGet("{id:int}/visitations")]
    public async Task<IActionResult> GetVisitations(int id)
    {
        var visits = await _db.HomeVisitations
            .Where(v => v.ResidentId == id)
            .OrderByDescending(v => v.VisitDate)
            .ToListAsync();
        return Ok(visits);
    }

    [HttpPost("{id:int}/visitations")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> AddVisitation(int id, [FromBody] HomeVisitation visitation)
    {
        if (!await _db.Residents.AsNoTracking().AnyAsync(r => r.ResidentId == id))
            return NotFound();

        var nextVisitationId = (await _db.HomeVisitations.MaxAsync(v => (int?)v.VisitationId) ?? 0) + 1;
        visitation.VisitationId = nextVisitationId;
        visitation.ResidentId = id;
        _db.HomeVisitations.Add(visitation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetVisitations), new { id }, visitation);
    }

    [HttpDelete("{id:int}/visitations/{visitationId:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> DeleteVisitation(int id, int visitationId)
    {
        var visit = await _db.HomeVisitations.FindAsync(visitationId);
        if (visit is null || visit.ResidentId != id) return NotFound();
        _db.HomeVisitations.Remove(visit);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public sealed record RecordingFormResidentOption(int ResidentId, string CaseControlNo);

    public sealed record ProcessRecordingFormOptionsResponse(
        IReadOnlyList<RecordingFormResidentOption> Residents,
        IReadOnlyList<string> SocialWorkers,
        IReadOnlyList<string> EmotionalStateObserved,
        IReadOnlyList<string> EmotionalStateEnd,
        IReadOnlyList<string> FollowUpActions);

    public sealed class SessionEntryRequest
    {
        public required DateOnly SessionDate { get; set; }
        public required string SocialWorker { get; set; }
        public required string SessionType { get; set; }
        public required int SessionDurationMinutes { get; set; }
        public required string EmotionalStateObserved { get; set; }
        public required string EmotionalStateEnd { get; set; }
        public required List<string> InterventionsApplied { get; set; }
        public required string FollowUpActions { get; set; }
        public required bool ProgressNoted { get; set; }
        public required bool ConcernsFlagged { get; set; }
        public required bool ReferralMade { get; set; }
    }
}
