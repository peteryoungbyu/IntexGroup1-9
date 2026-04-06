using Intex.API.Data;
using Intex.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class ReportController : ControllerBase
{
    private readonly IReportService _reports;

    public ReportController(IReportService reports) => _reports = reports;

    [HttpGet("annual/{year:int}")]
    public async Task<IActionResult> GetAnnual(int year) =>
        Ok(await _reports.GetAnnualAccomplishmentAsync(year));

    [HttpGet("donation-trends")]
    public async Task<IActionResult> GetDonationTrends([FromQuery] int months = 12) =>
        Ok(await _reports.GetDonationTrendsAsync(months));

    [HttpGet("reintegration")]
    public async Task<IActionResult> GetReintegration() =>
        Ok(await _reports.GetReintegrationOutcomesAsync());

    [HttpGet("safehouse-comparison")]
    public async Task<IActionResult> GetSafehouseComparison() =>
        Ok(await _reports.GetSafehouseComparisonAsync());
}
