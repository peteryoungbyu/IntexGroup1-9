using Intex.API.Data;
using Intex.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize(Policy = AuthPolicies.AdminRead)]
public class PredictionController : ControllerBase
{
    private readonly IPredictionService _predictions;

    public PredictionController(IPredictionService predictions) => _predictions = predictions;

    [HttpGet("resident/{id:int}")]
    public async Task<IActionResult> GetForResident(int id) =>
        Ok(await _predictions.GetForResidentAsync(id));

    [HttpGet("supporter/{id:int}")]
    public async Task<IActionResult> GetForSupporter(int id) =>
        Ok(await _predictions.GetForSupporterAsync(id));

    [HttpGet("model/{modelName}")]
    public async Task<IActionResult> GetByModel(string modelName, [FromQuery] int limit = 50) =>
        Ok(await _predictions.GetByModelAsync(modelName, limit));
}
