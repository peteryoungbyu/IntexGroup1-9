using System.ComponentModel.DataAnnotations;
using Intex.API.Data;
using Intex.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/partners")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class PartnerController : ControllerBase
{
    private readonly AppDbContext _db;

    public PartnerController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null)
    {
        var query = _db.Partners.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(p => p.PartnerName.Contains(search));
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.PartnerName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var partner = await _db.Partners
            .Include(p => p.Assignments)
            .FirstOrDefaultAsync(p => p.PartnerId == id);
        return partner is null ? NotFound() : Ok(partner);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] Partner partner)
    {
        _db.Partners.Add(partner);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = partner.PartnerId }, partner);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Update(int id, [FromBody] Partner updated)
    {
        var existing = await _db.Partners.FindAsync(id);
        if (existing is null) return NotFound();
        existing.PartnerName = updated.PartnerName;
        existing.Status = updated.Status;
        existing.ContactName = updated.ContactName;
        existing.Email = updated.Email;
        existing.Phone = updated.Phone;
        existing.Notes = updated.Notes;
        existing.EndDate = updated.EndDate;
        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        var partner = await _db.Partners.FindAsync(id);
        if (partner is null) return NotFound();
        _db.Partners.Remove(partner);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
