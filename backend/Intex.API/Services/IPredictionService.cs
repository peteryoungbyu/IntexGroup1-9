using Intex.API.Models;

namespace Intex.API.Services;

public interface IPredictionService
{
    Task<IReadOnlyList<PredictionResult>> GetForResidentAsync(int residentId);
    Task<IReadOnlyList<PredictionResult>> GetForSupporterAsync(int supporterId);
    Task<IReadOnlyList<PredictionResult>> GetByModelAsync(string modelName, int limit = 50);
}
