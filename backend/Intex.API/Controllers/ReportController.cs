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
    private readonly IReportInferenceTableService _inferenceTables;
    private readonly IReintegrationReadinessService _reintegration;
    private readonly IDonorUpsellService _donorUpsell;
    private readonly IInterventionEffectivenessService _interventionEffectiveness;
    private readonly ISocialMediaDonationsService _socialMediaDonations;
    private readonly IResidentRiskService _residentRisk;

    public ReportController(
        IReportService reports,
        IReportInferenceTableService inferenceTables,
        IReintegrationReadinessService reintegration,
        IDonorUpsellService donorUpsell,
        IInterventionEffectivenessService interventionEffectiveness,
        ISocialMediaDonationsService socialMediaDonations,
        IResidentRiskService residentRisk)
    {
        _reports = reports;
        _inferenceTables = inferenceTables;
        _reintegration = reintegration;
        _donorUpsell = donorUpsell;
        _interventionEffectiveness = interventionEffectiveness;
        _socialMediaDonations = socialMediaDonations;
        _residentRisk = residentRisk;
    }

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

    [HttpGet("inference-results/{jobKey}")]
    public async Task<IActionResult> GetInferenceResults(
        string jobKey,
        [FromQuery] int limit = 100,
        CancellationToken ct = default)
    {
        var result = await _inferenceTables.GetAsync(jobKey, limit, ct);
        return result is null ? NotFound() : Ok(result);
    }

    // ── ML Inference Trigger Endpoints ──────────────────────────────────────

    [HttpPost("inference/reintegration-readiness")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> RunReintegrationReadiness(CancellationToken ct)
    {
        var result = await _reintegration.RunAsync(ct);
        return result.Success ? Ok(result) : StatusCode(500, result);
    }

    [HttpPost("inference/donor-upsell")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> RunDonorUpsell(CancellationToken ct)
    {
        var result = await _donorUpsell.RunAsync(ct);
        return result.Success ? Ok(result) : StatusCode(500, result);
    }

    [HttpPost("inference/intervention-effectiveness")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> RunInterventionEffectiveness(CancellationToken ct)
    {
        var result = await _interventionEffectiveness.RunAsync(ct);
        return result.Success ? Ok(result) : StatusCode(500, result);
    }

    [HttpPost("inference/social-media-donations")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> RunSocialMediaDonations(CancellationToken ct)
    {
        var result = await _socialMediaDonations.RunAsync(ct);
        return result.Success ? Ok(result) : StatusCode(500, result);
    }

    [HttpPost("inference/resident-risk")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> RunResidentRisk(CancellationToken ct)
    {
        var result = await _residentRisk.RunAsync(ct);
        return result.Success ? Ok(result) : StatusCode(500, result);
    }
}
