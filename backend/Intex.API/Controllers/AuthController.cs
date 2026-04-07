using Intex.API.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly string _frontendUrl;

    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:3000";
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
            return Ok(new { isAuthenticated = false, userName = (string?)null, email = (string?)null, roles = Array.Empty<string>() });

        var user = await _userManager.GetUserAsync(User);
        if (user is null)
            return Ok(new { isAuthenticated = false, userName = (string?)null, email = (string?)null, roles = Array.Empty<string>() });

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            isAuthenticated = true,
            userName = user.UserName,
            email = user.Email,
            roles = roles.ToArray()
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.ForgetTwoFactorClientAsync();
        await _signInManager.SignOutAsync();
        return Ok();
    }

    [HttpGet("providers")]
    public async Task<IActionResult> Providers()
    {
        var schemes = await _signInManager.GetExternalAuthenticationSchemesAsync();
        return Ok(schemes.Select(s => new { s.Name, s.DisplayName }));
    }

    [HttpGet("external-login")]
    public IActionResult ExternalLogin([FromQuery] string provider, [FromQuery] string? returnPath)
    {
        var redirectUrl = Url.Action(nameof(ExternalCallback), "Auth", new { returnPath }, Request.Scheme);
        var properties = _signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);
        return Challenge(properties, provider);
    }

    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalCallback([FromQuery] string? returnPath)
    {
        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info is null) return Redirect($"{_frontendUrl}/login?error=external_failed");

        var result = await _signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, isPersistent: true, bypassTwoFactor: false);

        if (result.Succeeded)
            return Redirect(SanitizeReturnPath(returnPath, _frontendUrl));

        // New user — create account
        var email = info.Principal.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (email is null) return Redirect($"{_frontendUrl}/login?error=no_email");

        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded) return Redirect($"{_frontendUrl}/login?error=create_failed");
            await _userManager.AddToRoleAsync(user, AuthRoles.Donor);
        }

        await _userManager.AddLoginAsync(user, info);
        await _signInManager.SignInAsync(user, isPersistent: true);
        return Redirect(SanitizeReturnPath(returnPath, _frontendUrl));
    }

    private static string SanitizeReturnPath(string? path, string frontendUrl)
    {
        if (string.IsNullOrWhiteSpace(path) || !path.StartsWith('/') || path.StartsWith("//"))
            return frontendUrl;
        return $"{frontendUrl}{path}";
    }
}
