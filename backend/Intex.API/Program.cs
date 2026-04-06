using Intex.API.Data;
using Intex.API.Infrastructure;
using Intex.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Read config
var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://localhost:3000";
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];

// 2. Register both DbContexts
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("AppConnection")));

builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("IdentityConnection")));

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
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

// 8. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendClient", policy =>
        policy.WithOrigins(frontendUrl)
              .AllowCredentials()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// 9. Register app services
builder.Services.AddScoped<ISupporterService, SupporterService>();
builder.Services.AddScoped<IResidentService, ResidentService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IPredictionService, PredictionService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 10. Migrate databases and seed at startup
using (var scope = app.Services.CreateScope())
{
    var appDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await appDb.Database.MigrateAsync();

    var identityDb = scope.ServiceProvider.GetRequiredService<AuthIdentityDbContext>();
    await identityDb.Database.MigrateAsync();

    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(scope.ServiceProvider, app.Configuration);
}

// 11. Middleware pipeline — order matters
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSecurityHeaders();
app.UseCors("FrontendClient");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();

// Serve React build in production
if (!app.Environment.IsDevelopment())
{
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

app.Run();
