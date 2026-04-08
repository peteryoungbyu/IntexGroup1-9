using System.ComponentModel.DataAnnotations;
using Intex.API.Data;
using Intex.API.Models;
using Intex.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/supporters")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class SupporterController : ControllerBase
{
    private readonly ISupporterService _service;
    private readonly IDonorChurnInferenceService _donorChurnInferenceService;

    public SupporterController(
        ISupporterService service,
        IDonorChurnInferenceService donorChurnInferenceService)
    {
        _service = service;
        _donorChurnInferenceService = donorChurnInferenceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null)
        => Ok(await _service.GetAllAsync(page, pageSize, search, status));

    [HttpGet("churn")]
    public async Task<IActionResult> GetChurnPredictions()
        => Ok(await _service.GetChurnPredictionsAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Create([FromBody] Supporter supporter)
    {
        var created = await _service.CreateAsync(supporter);
        return CreatedAtAction(nameof(GetById), new { id = created.SupporterId }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Update(int id, [FromBody] Supporter supporter)
    {
        var result = await _service.UpdateAsync(id, supporter);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:int}/donations")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> AddDonation(int id, [FromBody] Donation donation)
    {
        var created = await _service.AddDonationAsync(id, donation);
        return Ok(created);
    }

    [HttpDelete("{id:int}/donations/{donationId:int}")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> DeleteDonation(int id, int donationId)
    {
        var deleted = await _service.DeleteDonationAsync(id, donationId);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("churn/run")]
    [Authorize(Policy = AuthPolicies.AdminManage)]
    public async Task<IActionResult> RunDonorChurnInference(
        [FromBody] DonorChurnRunRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _donorChurnInferenceService.RunAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid request",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (TimeoutException ex)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, new ProblemDetails
            {
                Title = "Inference timed out",
                Detail = ex.Message,
                Status = StatusCodes.Status504GatewayTimeout,
            });
        }
        catch (FileNotFoundException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
            {
                Title = "Inference configuration error",
                Detail = ex.Message,
                Status = StatusCodes.Status500InternalServerError,
            });
        }
    }
}

[ApiController]
[Route("api/donor/me")]
[Authorize(Policy = AuthPolicies.DonorSelf)]
public class DonorSelfController : ControllerBase
{
    private readonly ISupporterService _service;
    private readonly UserManager<ApplicationUser> _userManager;

    public DonorSelfController(ISupporterService service, UserManager<ApplicationUser> userManager)
    {
        _service = service;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyHistory()
    {
        var userId = _userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var result = await _service.GetByUserIdAsync(userId);
        return result is null ? NotFound() : Ok(result);
    }
}
