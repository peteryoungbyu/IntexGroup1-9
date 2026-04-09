namespace Intex.API.Services;

public record ReportInferenceColumnDto(string Key, string Label, string Format);

public record ReportInferenceTableDto(
    string JobKey,
    string? Note,
    IReadOnlyList<ReportInferenceColumnDto> Columns,
    IReadOnlyList<Dictionary<string, object?>> Rows);

public interface IReportInferenceTableService
{
    Task<ReportInferenceTableDto?> GetAsync(
        string jobKey,
    int limit = 100,
        CancellationToken cancellationToken = default);
}
