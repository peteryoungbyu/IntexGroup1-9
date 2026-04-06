# Security Principles — ASP.NET Core Identity + React

This document describes the security patterns used in this project. It is written as reusable principles so it can be attached to any similar project to guide setup and implementation.

Stack: ASP.NET Core Identity (cookie-based), SQLite, React + TypeScript (Vite), Bootstrap.

---

## Backend

### Identity & Database
- `ApplicationUser` extends `IdentityUser` — do not store custom auth state outside of Identity.
- Identity uses its own dedicated `AuthIdentityDbContext` (SQLite), isolated from any application `DbContext`. Never mix app data and identity data in the same context.
- Roles and policies are defined as `static class` constants (`AuthRoles`, `AuthPolicies`) — never use inline strings for role or policy names anywhere in the codebase.

### Roles & Policies
- Define all roles as `const string` fields in a static `AuthRoles` class.
- Define all policies as `const string` fields in a static `AuthPolicies` class.
- Register policies in `Program.cs` via `AddAuthorization(options => ...)`.
- Protect endpoints with `[Authorize(Policy = AuthPolicies.X)]` — not `[Authorize(Roles = "...")]` directly. Policy-based auth keeps role logic in one place.

### Seed / Default Identity
- Default admin credentials are read from `appsettings.json` under a dedicated config section (e.g. `GenerateDefaultIdentityAdmin`), not hardcoded in logic.
- Seed runs at startup inside a scoped service scope — not in middleware.
- Role creation is idempotent: check `RoleExistsAsync` before `CreateAsync`.
- Admin user creation is idempotent: check `FindByEmailAsync` before creating.
- Do not commit real credentials to source control — `appsettings.json` defaults are for local dev only.

### Auth Endpoints
- Map built-in Identity endpoints under `/api/auth` via `MapGroup("/api/auth").MapIdentityApi<ApplicationUser>()`.
- Add a custom `AuthController` at the same base route for endpoints Identity doesn't provide:
  - `GET /me` — returns `{ isAuthenticated, userName, email, roles[] }` for authenticated users, or an anonymous equivalent for unauthenticated requests. Never throw on unauthenticated — always return 200.
  - `POST /logout` — calls `SignOutAsync()`. The client clears its cookie.
- Roles in `/me` come from `ClaimTypes.Role` claims — deduplicate and sort before returning.

### External Login (Google OAuth)
- External providers are registered in `Program.cs` only when both `ClientId` and `ClientSecret` are present in config — never register a provider with empty credentials.
- Use `SignInScheme = IdentityConstants.ExternalScheme` when registering external providers.
- Expose a `GET /api/auth/providers` endpoint that returns only the providers that are actually configured — the frontend uses this to decide whether to show the external login button.
- Use a `GET /api/auth/external-login?provider=Google&returnPath=/catalog` endpoint to initiate the challenge. Validate that `provider` matches a known, configured scheme before calling `Challenge()`.
- Handle the callback in `GET /api/auth/external-callback`:
  1. Check for `remoteError` — redirect to frontend error URL if present.
  2. Call `GetExternalLoginInfoAsync()` — redirect to error if null.
  3. Try `ExternalLoginSignInAsync` — if it succeeds, redirect to the return path.
  4. If no existing login, extract email from external claims (`ClaimTypes.Email` or `"email"`).
  5. Look up or create a local `ApplicationUser` by email, then call `AddLoginAsync` to link the external login.
  6. Call `SignInAsync` with the login provider to establish the session.
- `returnPath` must be validated to start with `/` before use — prevents open redirect attacks. Reject or default anything that doesn't start with `/`.
- On error, redirect to `{frontendUrl}/login?externalError={message}` — never expose internal error details in the URL.
- `bypassTwoFactor: true` is passed to `ExternalLoginSignInAsync` — external provider is treated as a sufficient second factor.
- Google credentials are stored in config (`Authentication:Google:ClientId`, `Authentication:Google:ClientSecret`) — never hardcode them.
- The callback path (`/signin-google`) must match the redirect URI registered in Google Cloud Console.

### Password Policy
- Configured via `Configure<IdentityOptions>` in `Program.cs`.
- Example policy: minimum 14 characters, no digit/uppercase/lowercase/non-alphanumeric requirement, at least 1 unique char.
- Keep all password rules in one place — `Configure<IdentityOptions>`. Do not duplicate or override them elsewhere.

### Cookie Configuration
- Configured via `ConfigureApplicationCookie` in `Program.cs`.
- `HttpOnly = true` — must never be changed. Prevents JS access to the auth cookie.
- `SameSite = Lax` — balances CSRF protection with cross-origin cookie sending.
- `SecurePolicy = Always` — cookie is only sent over HTTPS.
- `ExpireTimeSpan = 7 days`, `SlidingExpiration = true` — session stays alive while the user is active.

### Security Headers
- Implement `UseSecurityHeaders()` as a custom `IApplicationBuilder` extension in `Infrastructure/SecurityHeaders.cs`.
- Set `Content-Security-Policy: default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'` on every response.
- Skip CSP for `/swagger` in development only — never skip in production.
- Apply `UseHsts()` in non-development environments only (inside `if (!app.Environment.IsDevelopment())`).

### CORS
- Restrict CORS to the configured `FrontendUrl` only — never use `AllowAnyOrigin()`.
- `AllowCredentials()` is required for cookie-based cross-origin auth to work.
- Never combine `AllowAnyOrigin()` with `AllowCredentials()` — ASP.NET Core will reject this.

### Middleware Order (Program.cs)
Must follow this exact order — sequence matters for security:
1. `UseHsts` (non-development only)
2. `UseSecurityHeaders`
3. `UseCors`
4. `UseHttpsRedirection`
5. `UseAuthentication`
6. `UseAuthorization` — call exactly once
7. `MapControllers`

---

## MFA (TOTP / Authenticator App)

### How It Works
MFA uses ASP.NET Core Identity's built-in 2FA endpoints via `MapIdentityApi`. No custom backend code is needed for the 2FA operations themselves.

1. **Setup** — `POST /api/auth/manage/2fa` with `{}` returns the user's `sharedKey` and current status.
2. **QR Code** — The frontend constructs an `otpauth://totp/{label}?secret={sharedKey}&issuer={issuer}` URI and renders it as a QR code using the `qrcode` npm package. Never show the raw `otpauth://` URI as plain text.
3. **Enable** — User scans the QR code or enters the shared key in an authenticator app, then submits the 6-digit TOTP code with `{ enable: true, twoFactorCode, resetRecoveryCodes: true }`.
4. **Recovery codes** — Returned only when enabling or explicitly resetting. Show once — the user must save them. Each code is single-use.
5. **Login with MFA** — Pass `twoFactorCode` or `twoFactorRecoveryCode` alongside credentials to `POST /api/auth/login`. Only one should be sent per request.
6. **Disable** — Send `{ enable: false }` to `POST /api/auth/manage/2fa`.
7. **Reset recovery codes** — Send `{ resetRecoveryCodes: true }` to regenerate codes without changing the shared key.

### `TwoFactorStatus` Shape
```ts
{
  sharedKey: string | null;        // base32 TOTP secret; null once MFA is confirmed enabled
  recoveryCodesLeft: number;       // single-use codes remaining
  recoveryCodes: string[] | null;  // only populated on enable/reset — save immediately
  isTwoFactorEnabled: boolean;
  isMachineRemembered: boolean;
}
```

### What a User Must Do to Enable MFA
1. Be signed in — guard the MFA page and show a warning if unauthenticated.
2. Install an authenticator app: Google Authenticator, Authy, Microsoft Authenticator, 1Password, etc.
3. Scan the QR code on the `/mfa` page, or manually type the shared key into the app.
4. Enter the 6-digit code shown by the app and click **Enable MFA**.
5. Save the recovery codes immediately — they are not shown again.

### MFA API Pattern (`authAPI.ts`)
Consolidate all 2FA calls into a single private `postTwoFactorRequest(payload)` function that POSTs to `/api/auth/manage/2fa` with `credentials: 'include'`. Export named wrappers:

| Export | Payload |
|---|---|
| `getTwoFactorStatus()` | `{}` |
| `enableTwoFactor(code)` | `{ enable: true, twoFactorCode, resetRecoveryCodes: true }` |
| `disableTwoFactor()` | `{ enable: false }` |
| `resetRecoveryCodes()` | `{ resetRecoveryCodes: true }` |

---

## Cookie Consent

### Pattern
- Wrap the app in a `CookieConsentProvider` that exposes `{ hasAcknowledgedConsent, acknowledgeConsent }`.
- Store the acknowledgement in `localStorage` under a stable key (e.g. `rootkit-cookie-consent`). This is a UI preference flag — not auth data — so `localStorage` is appropriate here.
- `useCookieConsent()` throws if used outside `CookieConsentProvider` — intentional, mirrors the `useAuth` pattern.
- Render a `CookieConsentBanner` component inside the router so it can link to the cookie policy page. The banner hides itself once `hasAcknowledgedConsent` is true.
- Provide a `/cookies` route with a `CookiePolicyPage` that lists every cookie the app sets and why.

### What to Disclose
- The Identity auth cookie (session persistence after login).
- Any temporary security cookies issued during external login challenges (e.g. Google OAuth).
- The consent acknowledgement flag itself (localStorage, not a cookie, but disclose it anyway).
- Explicitly state what you don't use: no analytics, no advertising, no cross-site tracking.

### What Not To Do
- Do not use `localStorage` or `sessionStorage` for auth tokens — only use it for UI preference flags like consent.
- Do not skip the cookie policy page — it is required for transparency and is good practice even for teaching apps.

---

## Frontend

### Auth State (`AuthContext`)
- `AuthSession` type: `{ isAuthenticated: boolean, userName: string | null, email: string | null, roles: string[] }`.
- `AuthProvider` wraps the app and provides auth state globally. `useAuth()` throws outside of it — intentional.
- On mount, call `GET /api/auth/me` to hydrate session state from the server cookie (`refreshAuthSession`).
- On error, fall back to an anonymous session object — never set auth state to `null`.

### API Calls (`authAPI.ts`)
- Every fetch uses `credentials: 'include'` — required for cross-origin cookie auth.
- `loginUser` accepts optional `twoFactorCode` and `twoFactorRecoveryCode` — only include the one the user provided.
- `rememberMe = true` → `useCookies=true`; `rememberMe = false` → `useSessionCookies=true`.
- External login uses a full browser redirect (not fetch) — build the URL with `buildExternalLoginUrl(provider, returnPath)` and assign `window.location.href`.
- `getExternalProviders()` fetches `GET /api/auth/providers` — use the result to conditionally render external login buttons. Never hardcode which providers are available.
- Error messages are extracted in order: `detail` → `title` → first value in `errors` → `message` → fallback string.

### Provider Nesting Order (`App.tsx`)
Must wrap from outermost to innermost:
1. `CookieConsentProvider` — outermost, no auth dependency
2. `AuthProvider`
3. `CartProvider` (or other app providers)
4. `Router`

### Routes
| Path | Component | Auth Required |
|---|---|---|
| `/login` | `LoginPage` | No |
| `/register` | `RegisterPage` | No |
| `/logout` | `LogoutPage` | No |
| `/cookies` | `CookiePolicyPage` | No |
| `/mfa` | `ManageMFAPage` | Yes (enforced in page) |
| `/admin/rootbeers` | `AdminRootbeerPage` | Yes — Admin policy |
| `/catalog`, `/` | `CatalogPage` | No |

---

## What Not To Do
- Do not store auth tokens in `localStorage` or `sessionStorage` — cookie-based auth only.
- Do not bypass `[Authorize]` by checking roles manually in controller logic.
- Do not use inline role/policy strings — always use `AuthRoles` and `AuthPolicies` constants.
- Do not call `UseAuthorization` more than once in `Program.cs`.
- Do not register an external provider (Google) unless both `ClientId` and `ClientSecret` are present in config.
- Do not use the `returnPath` from external login callbacks without validating it starts with `/`.
- Do not call any `/api/auth/manage/2fa` endpoint without confirming the user is authenticated first.
- Do not expose the `otpauth://` URI as plain text — render it only as a QR code.
- Do not commit real credentials (admin password, Google OAuth secrets) to source control.



