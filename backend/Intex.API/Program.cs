using Intex.API.Data;
using Intex.API.Infrastructure;
using Intex.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using DotNetEnv;
using System.Net;

Env.Load();
var builder = WebApplication.CreateBuilder(args);

// 1. Read config
var configuredFrontendUrls = builder.Configuration
    .GetSection("FrontendUrls")
    .Get<string[]>() ?? Array.Empty<string>();
var configuredSingleFrontendUrl = builder.Configuration["FrontendUrl"];
var frontendUrls = configuredFrontendUrls
    .Concat(string.IsNullOrWhiteSpace(configuredSingleFrontendUrl)
        ? Array.Empty<string>()
        : new[] { configuredSingleFrontendUrl })
    .Select(url => url.Trim().TrimEnd('/'))
    .Where(url => !string.IsNullOrWhiteSpace(url))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (frontendUrls.Length == 0)
{
    frontendUrls = builder.Environment.IsDevelopment()
        ? new[] { "http://localhost:3000", "https://localhost:3000" }
        : throw new InvalidOperationException("Set FrontendUrl or FrontendUrls in configuration for production.");
}

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];



builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("AppConnection")
    ));



builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AppConnection")));

// 3. Register Identity + roles
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AuthIdentityDbContext>();

// 4. Register Google OAuth only if credentials are present
if (!string.IsNullOrEmpty(googleClientId) && !string.IsNullOrEmpty(googleClientSecret))
{
    builder.Services.AddAuthentication()
        .AddGoogle(options =>
        {
            options.ClientId = googleClientId;
            options.ClientSecret = googleClientSecret;
            options.SignInScheme = IdentityConstants.ExternalScheme;
            options.CallbackPath = "/signin-google";
        });
}

// 5. Register policies
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(AuthPolicies.AdminManage, policy => policy.RequireRole(AuthRoles.Admin));
    options.AddPolicy(AuthPolicies.AdminRead, policy => policy.RequireRole(AuthRoles.Admin));
    options.AddPolicy(AuthPolicies.DonorSelf, policy => policy.RequireRole(AuthRoles.Donor, AuthRoles.Admin));
    options.AddPolicy(AuthPolicies.AnyAuthenticated, policy => policy.RequireAuthenticatedUser());
});

// 6. Configure Identity password options
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequiredLength = 14;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredUniqueChars = 1;
});

// 7. Configure auth cookie
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = builder.Environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

// 8. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendClient", policy =>
        policy.WithOrigins(frontendUrls)
              .AllowCredentials()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    // Trust Azure private proxy ranges instead of accepting forwarded headers from any source.
    options.KnownIPNetworks.Add(new(IPAddress.Parse("10.0.0.0"), 8));
    options.KnownIPNetworks.Add(new(IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new(IPAddress.Parse("192.168.0.0"), 16));
});

// 9. Register app services
builder.Services.AddScoped<ISupporterService, SupporterService>();
builder.Services.AddScoped<IResidentService, ResidentService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IReportInferenceTableService, ReportInferenceTableService>();
builder.Services.AddScoped<IPredictionService, PredictionService>();
builder.Services.Configure<DonorChurnInferenceOptions>(
    builder.Configuration.GetSection("DonorChurnInference"));
builder.Services.AddScoped<IDonorChurnInferenceService, DonorChurnInferenceService>();

builder.Services.Configure<ReintegrationReadinessOptions>(
    builder.Configuration.GetSection("ReintegrationReadiness"));
builder.Services.AddScoped<IReintegrationReadinessService, ReintegrationReadinessService>();

builder.Services.Configure<DonorUpsellOptions>(
    builder.Configuration.GetSection("DonorUpsell"));
builder.Services.AddScoped<IDonorUpsellService, DonorUpsellService>();

builder.Services.Configure<InterventionEffectivenessOptions>(
    builder.Configuration.GetSection("InterventionEffectiveness"));
builder.Services.AddScoped<IInterventionEffectivenessService, InterventionEffectivenessService>();

builder.Services.Configure<SocialMediaDonationsOptions>(
    builder.Configuration.GetSection("SocialMediaDonations"));
builder.Services.AddScoped<ISocialMediaDonationsService, SocialMediaDonationsService>();

builder.Services.Configure<ResidentRiskOptions>(
    builder.Configuration.GetSection("ResidentRisk"));
builder.Services.AddScoped<IResidentRiskService, ResidentRiskService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

var app = builder.Build();

// 10. Apply migrations and seed at startup
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("Startup");
    var appDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var identityDb = scope.ServiceProvider.GetRequiredService<AuthIdentityDbContext>();

    await EnsureDatabaseReadyAsync(appDb, "application", logger);
    await EnsureDatabaseReadyAsync(identityDb, "identity", logger);
    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(scope.ServiceProvider, app.Configuration);
}

// 11. Middleware pipeline — order matters
app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseSecurityHeaders();
app.UseCors("FrontendClient");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>().AllowAnonymous();

// Serve React build in production
if (!app.Environment.IsDevelopment())
{
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

app.Run();

static async Task EnsureDatabaseReadyAsync<TContext>(TContext dbContext, string databaseName, ILogger logger)
    where TContext : DbContext
{
    try
    {
        await MigrateDatabaseAsync(dbContext, databaseName, logger);
    }
    catch (InvalidOperationException ex) when (ex.InnerException is InvalidOperationException inner &&
                                               inner.Message.Contains(nameof(RelationalEventId.PendingModelChangesWarning), StringComparison.Ordinal))
    {
        logger.LogWarning(
            "Skipping automatic {DatabaseName} database migrations because the EF migration snapshot is out of sync with the mapped model. " +
            "Verifying connectivity only.",
            databaseName);

        try
        {
            await dbContext.Database.OpenConnectionAsync();
            await dbContext.Database.CloseConnectionAsync();
            logger.LogInformation("{DatabaseName} database connection verified", databaseName);
        }
        catch (Exception connectionEx)
        {
            throw new InvalidOperationException(
                $"Unable to verify the {databaseName} database using ConnectionStrings:AppConnection. {connectionEx.Message}",
                connectionEx);
        }
    }
}

static async Task MigrateDatabaseAsync<TContext>(TContext dbContext, string databaseName, ILogger logger)
    where TContext : DbContext
{
    try
    {
        logger.LogInformation("Applying {DatabaseName} database migrations", databaseName);
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("{DatabaseName} database is ready", databaseName);
    }
    catch (Exception ex)
    {
        throw new InvalidOperationException(
            $"Unable to initialize the {databaseName} database using ConnectionStrings:AppConnection. {ex.Message}",
            ex);
    }
}
