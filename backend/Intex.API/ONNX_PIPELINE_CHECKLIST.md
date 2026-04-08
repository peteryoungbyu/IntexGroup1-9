# ONNX Pipeline Checklist

Use this checklist when adding a new ONNX-based process.

1. Create options class with real keys only.
- Include at least `ModelPath` and any process-specific knobs (for example threshold or minimum data requirements).

2. Bind options in startup.
- In `Program.cs`: `builder.Services.Configure<YourOptions>(builder.Configuration.GetSection("YourSection"));`

3. Add matching settings in both config files.
- Add the same section keys in `appsettings.json` and `appsettings.Development.json`.
- Keep names exactly aligned with your options properties.

4. Resolve and validate model path before inference.
- Support both absolute and content-root-relative paths.
- Fail fast with a clear `FileNotFoundException` if the model file is missing.

5. Reuse shared ONNX diagnostics.
- Use `OnnxRuntimeDiagnostics.BuildDetailedExceptionMessage(ex)`.
- Use `OnnxRuntimeDiagnostics.GetRuntimeDiagnostics()`.

6. Catch native/runtime initialization failures explicitly.
- Catch `TypeInitializationException`, `DllNotFoundException`, and `BadImageFormatException`.
- Log detailed exception chain and runtime diagnostics in each catch block.

7. Add model execution context to logs.
- Include model path and row or record count in inference failure logs.

8. Keep CPU session defaults conservative first.
- Start with CPU provider and basic optimization flags.
- Only tune providers/threads after stability is confirmed.

9. Return actionable API error text.
- Return detailed diagnostic message in your run result object so admins can troubleshoot quickly.

10. Validate with both local build and publish output.
- Run `dotnet build` and `dotnet publish`.
- If publish-only failures occur, inspect native runtime files and architecture diagnostics.
