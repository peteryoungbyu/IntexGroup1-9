using Intex.API.Data;
using Intex.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/homevisitations")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class HomeVisitationController(AppDbContext db) : ControllerBase
{
    private readonly AppDbContext _db = db;

    // GET /api/homevisitations?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.HomeVisitations
            .Include(v => v.Resident)
            .OrderByDescending(v => v.VisitDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    // GET /api/homevisitations/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var monthStart = DateOnly.FromDateTime(new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc));

        var totalThisMonth = await _db.HomeVisitations
            .CountAsync(v => v.VisitDate >= monthStart);
        var safetyConcernsCount = await _db.HomeVisitations
            .CountAsync(v => v.SafetyConcernsNoted);
        var followUpRequiredCount = await _db.HomeVisitations
            .CountAsync(v => v.FollowUpNeeded);
        var favorableOutcomesCount = await _db.HomeVisitations
            .CountAsync(v => v.VisitOutcome == "Favorable");

        return Ok(new
        {
            totalThisMonth,
            safetyConcernsCount,
            followUpRequiredCount,
            favorableOutcomesCount,
        });
    }

    // POST /api/homevisitations
    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] HomeVisitation visitation)
    {
        var nextVisitationId = (await _db.HomeVisitations.MaxAsync(v => (int?)v.VisitationId) ?? 0) + 1;
        visitation.VisitationId = nextVisitationId;
        _db.HomeVisitations.Add(visitation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { }, visitation);
    }

    // DELETE /api/homevisitations/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        var visitation = await _db.HomeVisitations.FindAsync(id);
        if (visitation is null) return NotFound();
        _db.HomeVisitations.Remove(visitation);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
