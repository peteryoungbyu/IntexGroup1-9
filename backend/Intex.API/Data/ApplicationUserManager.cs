using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Intex.API.Data;

public class ApplicationUserManager : UserManager<ApplicationUser>
{
    private readonly IConfiguration _configuration;

    public ApplicationUserManager(
        IUserStore<ApplicationUser> store,
        IOptions<IdentityOptions> optionsAccessor,
        IPasswordHasher<ApplicationUser> passwordHasher,
        IEnumerable<IUserValidator<ApplicationUser>> userValidators,
        IEnumerable<IPasswordValidator<ApplicationUser>> passwordValidators,
        ILookupNormalizer keyNormalizer,
        IdentityErrorDescriber errors,
        IServiceProvider services,
        ILogger<UserManager<ApplicationUser>> logger,
        IConfiguration configuration)
        : base(
            store,
            optionsAccessor,
            passwordHasher,
            userValidators,
            passwordValidators,
            keyNormalizer,
            errors,
            services,
            logger)
    {
        _configuration = configuration;
    }

    public override async Task<IdentityResult> CreateAsync(ApplicationUser user)
    {
        var result = await base.CreateAsync(user);
        if (result.Succeeded)
            await EnsureDefaultDonorRoleAsync(user);

        return result;
    }

    public override async Task<IdentityResult> CreateAsync(ApplicationUser user, string password)
    {
        var result = await base.CreateAsync(user, password);
        if (result.Succeeded)
            await EnsureDefaultDonorRoleAsync(user);

        return result;
    }

    private async Task EnsureDefaultDonorRoleAsync(ApplicationUser user)
    {
        var adminEmail = _configuration["GenerateDefaultIdentityAdmin:Email"];
        if (!string.IsNullOrWhiteSpace(adminEmail) &&
            string.Equals(user.Email, adminEmail, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (await IsInRoleAsync(user, AuthRoles.Donor))
            return;

        var result = await AddToRoleAsync(user, AuthRoles.Donor);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to assign the default {AuthRoles.Donor} role to {user.Email ?? user.UserName}: " +
                string.Join(", ", result.Errors.Select(e => e.Description)));
        }
    }
}
