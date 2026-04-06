using Intex.API.Data;
using Intex.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/case-conferences")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class CaseConferenceController : ControllerBase
{
    private readonly AppDbContext _db;

    public CaseConferenceController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? residentId)
    {
        var query = _db.CaseConferences.AsQueryable();
        if (residentId.HasValue) query = query.Where(c => c.ResidentId == residentId.Value);
        return Ok(await query.OrderByDescending(c => c.ConferenceDate).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var conf = await _db.CaseConferences.FindAsync(id);
        return conf is null ? NotFound() : Ok(conf);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] CaseConference conference)
    {
        _db.CaseConferences.Add(conference);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = conference.ConferenceId }, conference);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Update(int id, [FromBody] CaseConference updated)
    {
        var existing = await _db.CaseConferences.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Agenda = updated.Agenda;
        existing.Decisions = updated.Decisions;
        existing.NextSteps = updated.NextSteps;
        existing.NextReviewDate = updated.NextReviewDate;
        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        var conf = await _db.CaseConferences.FindAsync(id);
        if (conf is null) return NotFound();
        _db.CaseConferences.Remove(conf);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
