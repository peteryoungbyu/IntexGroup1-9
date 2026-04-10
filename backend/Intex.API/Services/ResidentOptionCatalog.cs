namespace Intex.API.Services;

public static class ResidentOptionCatalog
{
    public static readonly string[] CaseStatuses = ["Active", "Closed", "Transferred"];
    public static readonly string[] BirthStatuses = ["Marital", "Non-Marital"];
    public static readonly string[] CaseCategories = ["Abandoned", "Foundling", "Surrendered", "Neglected"];
    public static readonly string[] ReferralSources = ["Government Agency", "NGO", "Police", "Self-Referral", "Community", "Court Order"];
    public static readonly string[] ReintegrationTypes = ["Family Reunification", "Foster Care", "Adoption (Domestic)", "Adoption (Inter-Country)", "Independent Living", "None"];
    public static readonly string[] ReintegrationStatuses = ["Not Started", "In Progress", "Completed", "On Hold"];
    public static readonly string[] RiskLevels = ["Low", "Medium", "High", "Critical"];

    public static readonly int[] SafehouseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    public static readonly IReadOnlyList<ResidentSafehouseOption> Safehouses = SafehouseIds
        .Select(id => new ResidentSafehouseOption(id, $"Safehouse {id}"))
        .ToArray();
}
