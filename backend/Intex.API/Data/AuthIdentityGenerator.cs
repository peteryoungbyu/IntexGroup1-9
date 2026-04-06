using Microsoft.AspNetCore.Identity;

namespace Intex.API.Data;

public static class AuthIdentityGenerator
{
    public static async Task GenerateDefaultIdentityAsync(IServiceProvider services, IConfiguration config)
    {
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
        await EnsureUser(userManager, config,
            "GenerateDefaultIdentityDonor:Email",
            "GenerateDefaultIdentityDonor:Password",
            AuthRoles.Donor);

        // Seed MFA account
        await EnsureUser(userManager, config,
            "GenerateDefaultIdentityMfa:Email",
            "GenerateDefaultIdentityMfa:Password",
            AuthRoles.Donor);
    }

    private static async Task EnsureUser(
        UserManager<ApplicationUser> userManager,
        IConfiguration config,
        string emailKey,
        string passwordKey,
        string role)
    {
        var email = config[emailKey];
        var password = config[passwordKey];

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            return;

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
    }
}
