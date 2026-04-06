# Project Architecture — ASP.NET Core Identity + React Auth App

This file describes the architecture of a cookie-based authentication app using ASP.NET Core Identity on the backend and React + TypeScript on the frontend. Use this as a blueprint to replicate the setup in a new project.

Full security principles and rules are in `Security.md`.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core (.NET 10), C# |
| Auth | ASP.NET Core Identity + Identity API endpoints |
| Database | Entity Framework Core + SQLite (two separate databases) |
| External Auth | Google OAuth (`Microsoft.AspNetCore.Authentication.Google`) |
| Frontend | React 19 + TypeScript, Vite, React Router v7 |
| UI | Bootstrap 5 |
| MFA QR codes | `qrcode` npm package |

---

## Backend Setup

### NuGet Packages Required
```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.Google" />
<PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" />
<PackageReference Include="Swashbuckle.AspNetCore" />
```

### File Structure
```
Controllers/
  AuthController.cs          # /me, /logout, /providers, /external-login, /external-callback
  [YourApp]Controller.cs     # protected app endpoints using [Authorize(Policy = ...)]
Data/
  ApplicationUser.cs         # extends IdentityUser
  AuthIdentityDbContext.cs   # IdentityDbContext<ApplicationUser> — separate from app DbContext
  AuthIdentityGenerator.cs   # seeds roles and default admin on startup
  AuthRoles.cs               # static class with const role name strings
  AuthPolicies.cs            # static class with const policy name strings
  [YourApp]DbContext.cs      # separate EF context for app data
Infrastructure/
  SecurityHeaders.cs         # UseSecurityHeaders() middleware extension
Migrations/                  # EF migrations for AuthIdentityDbContext only
```

### `ApplicationUser.cs`
```csharp
public class ApplicationUser : IdentityUser { }
```

### `AuthRoles.cs`
```csharp
public static class AuthRoles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
}
```

### `AuthPolicies.cs`
```csharp
public static class AuthPolicies
{
    public const string ManageCatalog = "ManagingCatalog";
}
```

### `AuthIdentityDbContext.cs`
```csharp
public class AuthIdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public AuthIdentityDbContext(DbContextOptions<AuthIdentityDbContext> options) : base(options) { }
}
```

### `AuthIdentityGenerator.cs` — Startup Seeder
- Called once at startup inside a scoped `IServiceProvider`.
- Creates all roles in `AuthRoles` if they don't already exist.
- Creates the default admin user from config if not already present.
- Assigns the Admin role to the admin user.
- Reads credentials from `appsettings.json` under `GenerateDefaultIdentityAdmin:Email` and `GenerateDefaultIdentityAdmin:Password`.

### `SecurityHeaders.cs`
```csharp
public static class SecurityHeaders
{
    public const string ContentSecurityPolicy =
        "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'";

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        var environment = app.ApplicationServices.GetRequiredService<IWebHostEnvironment>();
        return app.Use(async (context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                if (!(environment.IsDevelopment() && context.Request.Path.StartsWithSegments("/swagger")))
                    context.Response.Headers["Content-Security-Policy"] = ContentSecurityPolicy;
                return Task.CompletedTask;
            });
            await next();
        });
    }
}
```

### `Program.cs` — Registration Order
```csharp
// 1. Read config
var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://localhost:3000";
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];

// 2. Register both DbContexts
builder.Services.AddDbContext<AppDbContext>(...);
builder.Services.AddDbContext<AuthIdentityDbContext>(...);

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
    options.AddPolicy(AuthPolicies.ManageCatalog, policy => policy.RequireRole(AuthRoles.Admin));
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
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

// 8. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendClient", policy =>
        policy.WithOrigins(frontendUrl).AllowCredentials().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// 9. Seed roles and admin user at startup
using (var scope = app.Services.CreateScope())
    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(scope.ServiceProvider, app.Configuration);

// 10. Middleware pipeline — order matters
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseSecurityHeaders();
app.UseCors("FrontendClient");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();  // call exactly once
app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();
```

### `appsettings.json` Keys Required
```json
{
  "FrontendUrl": "http://localhost:3000",
  "ConnectionStrings": {
    "RootkitAuthConnection": "Data Source=App.sqlite",
    "RootkitIdentityConnection": "Data Source=Identity.sqlite"
  },
  "GenerateDefaultIdentityAdmin": {
    "Email": "admin@example.local",
    "Password": "ChangeMe2026!Local"
  }
}
```

Google credentials go in **user secrets** (never `appsettings.json`):
```json
{
  "Authentication:Google:ClientId": "...",
  "Authentication:Google:ClientSecret": "..."
}
```

### Migrations
Identity uses its own `AuthIdentityDbContext` — run migrations against it specifically:
```bash
dotnet ef migrations add InitialIdentity --context AuthIdentityDbContext
dotnet ef database update --context AuthIdentityDbContext
```

---

## `AuthController.cs` — Endpoints to Implement

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/auth/me` | Returns `{ isAuthenticated, userName, email, roles[] }` — always 200 |
| `POST` | `/api/auth/logout` | Calls `SignOutAsync()` |
| `GET` | `/api/auth/providers` | Returns list of configured external providers |
| `GET` | `/api/auth/external-login` | Initiates OAuth challenge for a given provider |
| `GET` | `/api/auth/external-callback` | Handles OAuth callback, creates/links local user, sets cookie |

Built-in Identity endpoints (register, login, manage/2fa, etc.) are provided automatically by `MapIdentityApi<ApplicationUser>()`.

---

## Frontend Setup

### npm Packages Required
```bash
npm install react react-dom react-router-dom bootstrap qrcode
npm install -D typescript @types/react @types/react-dom @types/qrcode vite @vitejs/plugin-react
```

### File Structure
```
src/
  types/
    AuthSession.ts             # { isAuthenticated, userName, email, roles[] }
    TwofactorStatus.ts         # { sharedKey, recoveryCodesLeft, recoveryCodes, isTwoFactorEnabled, isMachineRemembered }
  context/
    AuthContext.tsx             # AuthProvider, useAuth()
    CookieConsentContext.tsx    # CookieConsentProvider, useCookieConsent()
  lib/
    authAPI.ts                 # all auth fetch calls
    [appName]Api.ts            # app-specific fetch calls
  components/
    Header.tsx                 # nav bar — reads from useAuth()
    CookieConsentBanner.tsx    # shown until user acknowledges
  pages/
    LoginPage.tsx              # email + password + optional MFA fields
    RegisterPage.tsx           # email + password
    LogoutPage.tsx             # calls logoutUser(), redirects
    ManageMFAPage.tsx          # QR code setup, enable/disable, recovery codes
    CookiePolicyPage.tsx       # discloses all cookies used
    [Your app pages]
  App.tsx                      # provider nesting + route definitions
  main.tsx                     # ReactDOM.createRoot entry point
```

### Provider Nesting Order in `App.tsx`
```tsx
<CookieConsentProvider>      // outermost — no dependencies
  <AuthProvider>             // reads cookie session on mount
    <CartProvider>           // or other app providers
      <Router>
        <Routes> ... </Routes>
        <CookieConsentBanner />   // inside Router so it can use <Link>
      </Router>
    </CartProvider>
  </AuthProvider>
</CookieConsentProvider>
```

### `AuthSession` Type
```ts
export interface AuthSession {
  isAuthenticated: boolean;
  userName: string | null;
  email: string | null;
  roles: string[];
}
```

### `AuthContext` Pattern
- `authSession` — current session, defaults to anonymous object (never null).
- `isAuthenticated` — boolean shortcut.
- `isLoading` — true until the first `/me` call resolves.
- `refreshAuthSession()` — re-fetches `/me` and updates state (call after login/logout).
- `useAuth()` throws if used outside `AuthProvider`.

### `authAPI.ts` — Functions to Implement

| Function | Method | Endpoint | Notes |
|---|---|---|---|
| `getAuthSession()` | GET | `/api/auth/me` | Always `credentials: 'include'` |
| `loginUser(email, password, rememberMe, twoFactorCode?, twoFactorRecoveryCode?)` | POST | `/api/auth/login` | `useCookies` or `useSessionCookies` query param |
| `registerUser(email, password)` | POST | `/api/auth/register` | |
| `logoutUser()` | POST | `/api/auth/logout` | |
| `getExternalProviders()` | GET | `/api/auth/providers` | Drives whether to show OAuth buttons |
| `buildExternalLoginUrl(provider, returnPath)` | — | — | Returns URL string for `window.location.href` |
| `getTwoFactorStatus()` | POST | `/api/auth/manage/2fa` | Payload: `{}` |
| `enableTwoFactor(code)` | POST | `/api/auth/manage/2fa` | Payload: `{ enable: true, twoFactorCode, resetRecoveryCodes: true }` |
| `disableTwoFactor()` | POST | `/api/auth/manage/2fa` | Payload: `{ enable: false }` |
| `resetRecoveryCodes()` | POST | `/api/auth/manage/2fa` | Payload: `{ resetRecoveryCodes: true }` |

Error extraction priority from response body: `detail` → `title` → first value in `errors{}` → `message` → fallback string.

### `CookieConsentContext` Pattern
- Reads `localStorage.getItem('your-app-cookie-consent')` on init.
- `acknowledgeConsent()` writes `'acknowledged'` to localStorage and updates state.
- `useCookieConsent()` throws outside `CookieConsentProvider`.

### Environment Variable
```
VITE_API_BASE_URL=        # leave empty for same-origin; set to backend URL for cross-origin dev
```

---

## Replication Checklist

### Backend
- [ ] Create `ApplicationUser`, `AuthRoles`, `AuthPolicies`, `AuthIdentityDbContext`
- [ ] Create `AuthIdentityGenerator` to seed roles + admin at startup
- [ ] Create `SecurityHeaders` middleware extension
- [ ] Register everything in `Program.cs` in the correct order (see above)
- [ ] Add `appsettings.json` keys; put Google credentials in user secrets
- [ ] Run EF migrations against `AuthIdentityDbContext`
- [ ] Implement `AuthController` with `/me`, `/logout`, `/providers`, `/external-login`, `/external-callback`
- [ ] Protect app endpoints with `[Authorize(Policy = AuthPolicies.X)]`

### Frontend
- [ ] Create `AuthSession` and `TwoFactorStatus` types
- [ ] Create `AuthContext` with `AuthProvider` and `useAuth()`
- [ ] Create `CookieConsentContext` with `CookieConsentProvider` and `useCookieConsent()`
- [ ] Implement all functions in `authAPI.ts`
- [ ] Build `LoginPage` with optional MFA fields (authenticator code + recovery code)
- [ ] Build `ManageMFAPage` with QR code rendering, enable/disable, recovery code display
- [ ] Build `CookieConsentBanner` and `CookiePolicyPage`
- [ ] Nest providers in correct order in `App.tsx`
- [ ] Add `CookieConsentBanner` inside `<Router>` but outside `<Routes>`

### Google OAuth (optional)
- [ ] Register Google app at console.cloud.google.com
- [ ] Set authorized redirect URI to `https://localhost:{port}/signin-google`
- [ ] Store credentials in user secrets, not `appsettings.json`
- [ ] Implement `/providers`, `/external-login`, `/external-callback` in `AuthController`
- [ ] Use `buildExternalLoginUrl()` + `window.location.href` on the frontend (not fetch)
