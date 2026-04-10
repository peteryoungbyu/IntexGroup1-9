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

    [HttpGet("form-options")]
    public async Task<IActionResult> GetFormOptions()
        => Ok(await _service.GetFormOptionsAsync());

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
    public async Task<IActionResult> Create([FromBody] CreateSupporterRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var supporter = request.ToSupporter();
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
    public async Task<IActionResult> AddDonation(int id, [FromBody] CreateAdminDonationRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var created = await _service.AddDonationAsync(
            id,
            new CreateSupporterDonationRequest(
                request.Amount,
                request.IsRecurring,
                request.ProgramArea,
                request.SafehouseId));
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

public sealed class CreateSupporterRequest
{
    [Required]
    public string SupporterType { get; set; } = string.Empty;

    public string? OrganizationName { get; set; }

    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public string RelationshipType { get; set; } = string.Empty;

    [Required]
    public string Region { get; set; } = string.Empty;

    [Required]
    public string Country { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\+\d{1,3} \(\d{3}\) \d{3}-\d{4}$", ErrorMessage = "Phone must match +1 (347) 358-4878.")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = string.Empty;

    [Required]
    public DateOnly? FirstDonationDate { get; set; }

    [Required]
    public string AcquisitionChannel { get; set; } = string.Empty;

    public Supporter ToSupporter()
    {
        var firstName = FirstName.Trim();
        var lastName = LastName.Trim();

        return new Supporter
        {
            SupporterType = SupporterType.Trim(),
            DisplayName = $"{firstName} {lastName}".Trim(),
            OrganizationName = string.IsNullOrWhiteSpace(OrganizationName) ? null : OrganizationName.Trim(),
            FirstName = firstName,
            LastName = lastName,
            RelationshipType = RelationshipType.Trim(),
            Region = Region.Trim(),
            Country = Country.Trim(),
            Email = Email.Trim(),
            Phone = Phone.Trim(),
            Status = Status.Trim(),
            CreatedAt = DateTime.UtcNow,
            FirstDonationDate = FirstDonationDate,
            AcquisitionChannel = AcquisitionChannel.Trim(),
            LikelyChurn = false,
            ChurnProbability = 0.000m,
        };
    }
}

[ApiController]
[Route("api/donor/me")]
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
    [Authorize(Policy = AuthPolicies.DonorSelf)]
    public async Task<IActionResult> GetMyHistory()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var result = await _service.GetByUserAsync(user.Id, user.Email);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("pledge-options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPledgeOptions()
        => Ok(await _service.GetDonorPledgeOptionsAsync());

    [HttpPost("pledge")]
    [Authorize(Policy = AuthPolicies.DonorSelf)]
    public async Task<IActionResult> CreatePledge([FromBody] CreateDonorPledgeRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Unable to create pledge",
                Detail = "The signed-in account does not have an email address.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var donation = await _service.CreateDonorPledgeAsync(
            user.Id,
            user.Email,
            request.Amount,
            request.IsRecurring,
            request.ProgramArea,
            request.SafehouseId);

        if (!await _userManager.IsInRoleAsync(user, AuthRoles.Admin) &&
            !await _userManager.IsInRoleAsync(user, AuthRoles.Donor))
        {
            await _userManager.AddToRoleAsync(user, AuthRoles.Donor);
        }

        return Ok(donation);
    }
}

public sealed class CreateDonorPledgeRequest
{
    [Range(0.01, 1_000_000_000)]
    public decimal Amount { get; set; }

    public bool IsRecurring { get; set; }

    public string? ProgramArea { get; set; }

    public int? SafehouseId { get; set; }
}

public sealed class CreateAdminDonationRequest
{
    [Range(0.01, 1_000_000_000)]
    public decimal Amount { get; set; }

    public bool IsRecurring { get; set; }

    public string? ProgramArea { get; set; }

    public int? SafehouseId { get; set; }
}
