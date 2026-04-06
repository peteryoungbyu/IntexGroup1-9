using Intex.API.Data;
using Intex.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/social-media")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class SocialMediaController : ControllerBase
{
    private readonly AppDbContext _db;

    public SocialMediaController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? platform = null,
        [FromQuery] string? postType = null)
    {
        var query = _db.SocialMediaPosts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(platform)) query = query.Where(p => p.Platform == platform);
        if (!string.IsNullOrWhiteSpace(postType)) query = query.Where(p => p.PostType == postType);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var post = await _db.SocialMediaPosts.FindAsync(id);
        return post is null ? NotFound() : Ok(post);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] SocialMediaPost post)
    {
        _db.SocialMediaPosts.Add(post);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = post.PostId }, post);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Update(int id, [FromBody] SocialMediaPost updated)
    {
        var existing = await _db.SocialMediaPosts.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Caption = updated.Caption;
        existing.PostType = updated.PostType;
        existing.CampaignName = updated.CampaignName;
        existing.IsBoosted = updated.IsBoosted;
        existing.BoostBudgetPhp = updated.BoostBudgetPhp;
        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        var post = await _db.SocialMediaPosts.FindAsync(id);
        if (post is null) return NotFound();
        _db.SocialMediaPosts.Remove(post);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
