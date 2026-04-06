using Intex.API.Data;
using Intex.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Services;

public class PredictionService : IPredictionService
{
    private readonly AppDbContext _db;

    public PredictionService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<PredictionResult>> GetForResidentAsync(int residentId) =>
        await _db.PredictionResults
            .Where(p => p.ResidentId == residentId)
            .OrderByDescending(p => p.GeneratedAt)
            .ToListAsync();

    public async Task<IReadOnlyList<PredictionResult>> GetForSupporterAsync(int supporterId) =>
        await _db.PredictionResults
            .Where(p => p.SupporterId == supporterId)
            .OrderByDescending(p => p.GeneratedAt)
            .ToListAsync();

    public async Task<IReadOnlyList<PredictionResult>> GetByModelAsync(string modelName, int limit = 50) =>
        await _db.PredictionResults
            .Where(p => p.ModelName == modelName)
            .OrderByDescending(p => p.GeneratedAt)
            .Take(limit)
            .ToListAsync();
}
