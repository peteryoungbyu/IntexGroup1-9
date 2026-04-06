namespace Intex.API.Models;

public class SupporterUserLink
{
    public int LinkId { get; set; }
    public int SupporterId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public Supporter Supporter { get; set; } = null!;
}
