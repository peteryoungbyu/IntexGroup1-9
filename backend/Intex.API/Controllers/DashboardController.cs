using Intex.API.Data;
using Intex.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboard;

    public DashboardController(IDashboardService dashboard) => _dashboard = dashboard;

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _dashboard.GetAdminDashboardAsync());
}
