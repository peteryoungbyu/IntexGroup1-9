using System.ComponentModel.DataAnnotations;
using Intex.API.Data;
using Intex.API.Models;
using Intex.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class ResidentController : ControllerBase
{
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

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] Resident resident)
    {
        var created = await _service.CreateAsync(resident);
        return CreatedAtAction(nameof(GetById), new { id = created.ResidentId }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Update(int id, [FromBody] Resident resident)
    {
        var result = await _service.UpdateAsync(id, resident);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
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
}
