using Intex.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Intex.API.Data;

public static class AuthIdentityGenerator
{
    public static async Task GenerateDefaultIdentityAsync(IServiceProvider services, IConfiguration config)
    {
        var appDb = services.GetRequiredService<AppDbContext>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Ensure all roles exist
        foreach (var role in new[] { AuthRoles.Admin, AuthRoles.Donor })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed admin account (no MFA)
        await EnsureUser(userManager, config,
            "GenerateDefaultIdentityAdmin:Email",
            "GenerateDefaultIdentityAdmin:Password",
            AuthRoles.Admin);

        // Seed donor account (no MFA)
        var donorUser = await EnsureUser(userManager, config,
            "GenerateDefaultIdentityDonor:Email",
            "GenerateDefaultIdentityDonor:Password",
            AuthRoles.Donor);
        await EnsureSeedDonorHistoryAsync(appDb, donorUser);

        // Seed MFA account
        await EnsureUser(userManager, config,
            "GenerateDefaultIdentityMfa:Email",
            "GenerateDefaultIdentityMfa:Password",
            AuthRoles.Donor);
    }

    private static async Task<ApplicationUser?> EnsureUser(
        UserManager<ApplicationUser> userManager,
        IConfiguration config,
        string emailKey,
        string passwordKey,
        string role)
    {
        var email = config[emailKey];
        var password = config[passwordKey];

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            return null;

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new InvalidOperationException($"Failed to create seed user {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }

        if (!await userManager.IsInRoleAsync(user, role))
            await userManager.AddToRoleAsync(user, role);

        return user;
    }

    private static async Task EnsureSeedDonorHistoryAsync(AppDbContext appDb, ApplicationUser? donorUser)
    {
        if (donorUser is null || string.IsNullOrWhiteSpace(donorUser.Email))
            return;

        var donorEmail = donorUser.Email.Trim();
        var donorLinks = await appDb.SupporterUserLinks
            .Where(link => link.UserId == donorUser.Id)
            .OrderBy(link => link.LinkId)
            .ToListAsync();

        Supporter? supporter = null;
        if (donorLinks.Count > 0)
        {
            var linkedSupporterId = donorLinks[0].SupporterId;
            supporter = await appDb.Supporters
                .FirstOrDefaultAsync(s => s.SupporterId == linkedSupporterId);
        }

        supporter ??= await appDb.Supporters
            .FirstOrDefaultAsync(s => s.Email == donorEmail);

        if (supporter is null)
        {
            supporter = new Supporter
            {
                SupporterId = await GetNextSupporterIdAsync(appDb),
                SupporterType = "MonetaryDonor",
                DisplayName = "Grading Donor",
                FirstName = "Grading",
                LastName = "Donor",
                RelationshipType = "Local",
                Region = "Metro Manila",
                Country = "Philippines",
                Email = donorEmail,
                Phone = "N/A",
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                AcquisitionChannel = "Website",
                FirstDonationDate = null,
                LikelyChurn = false,
                ChurnProbability = 0,
            };

            appDb.Supporters.Add(supporter);
            await appDb.SaveChangesAsync();
        }
        else if (!string.Equals(supporter.Email, donorEmail, StringComparison.OrdinalIgnoreCase))
        {
            supporter.Email = donorEmail;
        }

        if (donorLinks.Count == 0)
        {
            appDb.SupporterUserLinks.Add(new SupporterUserLink
            {
                SupporterId = supporter.SupporterId,
                UserId = donorUser.Id,
            });
        }
        else
        {
            donorLinks[0].SupporterId = supporter.SupporterId;

            if (donorLinks.Count > 1)
                appDb.SupporterUserLinks.RemoveRange(donorLinks.Skip(1));
        }

        var existingDonationCount = await appDb.Donations
            .CountAsync(donation => donation.SupporterId == supporter.SupporterId);

        if (existingDonationCount == 0)
        {
            var earlierDonationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));
            var recentDonationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-2));
            var nextDonationId = await GetNextDonationIdAsync(appDb);

            var donations = new[]
            {
                new Donation
                {
                    DonationId = nextDonationId++,
                    SupporterId = supporter.SupporterId,
                    DonationType = "Monetary",
                    DonationDate = earlierDonationDate,
                    ChannelSource = "Website",
                    CurrencyCode = "PHP",
                    Amount = 1500m,
                    EstimatedValue = 1500m,
                    ImpactUnit = "pesos",
                    IsRecurring = false,
                    CampaignName = "Seeded Grading Donation",
                    Notes = "Seeded to ensure the grading donor account has historical donations.",
                },
                new Donation
                {
                    DonationId = nextDonationId++,
                    SupporterId = supporter.SupporterId,
                    DonationType = "Monetary",
                    DonationDate = recentDonationDate,
                    ChannelSource = "Website",
                    CurrencyCode = "PHP",
                    Amount = 2500m,
                    EstimatedValue = 2500m,
                    ImpactUnit = "pesos",
                    IsRecurring = true,
                    CampaignName = "Seeded Monthly Support",
                    Notes = "Seeded recurring donation for grading and donor-history verification.",
                },
            };

            appDb.Donations.AddRange(donations);
            supporter.FirstDonationDate = earlierDonationDate;

            var safehouseId = await appDb.Safehouses
                .Where(safehouse => safehouse.Status == "Active")
                .OrderBy(safehouse => safehouse.SafehouseId)
                .Select(safehouse => (int?)safehouse.SafehouseId)
                .FirstOrDefaultAsync();

            if (safehouseId.HasValue)
            {
                appDb.DonationAllocations.AddRange(
                    new DonationAllocation
                    {
                        DonationId = donations[0].DonationId,
                        SafehouseId = safehouseId.Value,
                        ProgramArea = "Safe Shelter & Daily Care",
                        AmountAllocated = 900m,
                        AllocationDate = earlierDonationDate,
                        AllocationNotes = "Seeded allocation for grading donor impact history.",
                    },
                    new DonationAllocation
                    {
                        DonationId = donations[0].DonationId,
                        SafehouseId = safehouseId.Value,
                        ProgramArea = "Healing & Counseling",
                        AmountAllocated = 600m,
                        AllocationDate = earlierDonationDate,
                        AllocationNotes = "Seeded allocation for grading donor impact history.",
                    },
                    new DonationAllocation
                    {
                        DonationId = donations[1].DonationId,
                        SafehouseId = safehouseId.Value,
                        ProgramArea = "Education & Training",
                        AmountAllocated = 2500m,
                        AllocationDate = recentDonationDate,
                        AllocationNotes = "Seeded allocation for grading donor impact history.",
                    });
            }
        }
        else if (!supporter.FirstDonationDate.HasValue)
        {
            supporter.FirstDonationDate = await appDb.Donations
                .Where(donation => donation.SupporterId == supporter.SupporterId)
                .OrderBy(donation => donation.DonationDate)
                .Select(donation => (DateOnly?)donation.DonationDate)
                .FirstOrDefaultAsync();
        }

        await appDb.SaveChangesAsync();
    }

    private static async Task<int> GetNextSupporterIdAsync(AppDbContext appDb)
    {
        var maxId = await appDb.Supporters.MaxAsync(supporter => (int?)supporter.SupporterId) ?? 0;
        return maxId + 1;
    }

    private static async Task<int> GetNextDonationIdAsync(AppDbContext appDb)
    {
        var maxId = await appDb.Donations.MaxAsync(donation => (int?)donation.DonationId) ?? 0;
        return maxId + 1;
    }
}
