using Intex.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly IDashboardService _dashboard;

    public PublicController(IDashboardService dashboard) => _dashboard = dashboard;

    [HttpGet("impact")]
    public async Task<IActionResult> GetImpactSnapshots([FromQuery] int count = 6)
    {
        var snapshots = await _dashboard.GetPublicSnapshotsAsync(count);
        return Ok(snapshots);
    }

    [HttpGet("org-summary")]
    public async Task<IActionResult> GetOrgSummary()
    {
        var summary = await _dashboard.GetPublicOrgSummaryAsync();
        return Ok(summary);
    }
}
