using System.Diagnostics;
using System.Globalization;
using System.Text;
using Microsoft.Extensions.Options;

namespace Intex.API.Services;

public class DonorChurnInferenceOptions
{
    public string PythonExecutablePath { get; set; } = "/usr/bin/python3";
    public string ScriptPath { get; set; } = "ml-runtime/run_donor_churn_inference.py";
    public string PythonPackagesPath { get; set; } = "ml-runtime/python-packages";
    public string WorkingDirectory { get; set; } = ".";
    public int TimeoutSeconds { get; set; } = 300;
}

public class DonorChurnInferenceService : IDonorChurnInferenceService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<DonorChurnInferenceService> _logger;
    private readonly DonorChurnInferenceOptions _options;

    public DonorChurnInferenceService(
        IWebHostEnvironment environment,
        IOptions<DonorChurnInferenceOptions> options,
        ILogger<DonorChurnInferenceService> logger)
    {
        _environment = environment;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<DonorChurnRunResult> RunAsync(
        DonorChurnRunRequest request,
        CancellationToken cancellationToken = default)
    {
        var contentRoot = _environment.ContentRootPath;
        var workingDirectory = ResolvePath(_options.WorkingDirectory, contentRoot);
        var pythonPath = ResolveExecutablePath(_options.PythonExecutablePath, contentRoot);
        var scriptPath = ResolvePath(_options.ScriptPath, workingDirectory);
        var pythonPackagesPath = ResolvePath(_options.PythonPackagesPath, workingDirectory);

        if (IsPathLike(pythonPath) && !File.Exists(pythonPath))
            throw new FileNotFoundException($"Configured Python executable was not found: {pythonPath}");

        if (!File.Exists(scriptPath))
            throw new FileNotFoundException($"Configured inference script was not found: {scriptPath}");

        var args = new List<string> { scriptPath };
        if (!string.IsNullOrWhiteSpace(request.AsOfDate))
        {
            if (!DateOnly.TryParseExact(request.AsOfDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                throw new ArgumentException("asOfDate must use YYYY-MM-DD format.", nameof(request));

            args.Add("--as-of-date");
            args.Add(request.AsOfDate);
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = pythonPath,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        foreach (var arg in args)
            startInfo.ArgumentList.Add(arg);

        if (Directory.Exists(pythonPackagesPath))
        {
            var existingPythonPath = startInfo.Environment.TryGetValue("PYTHONPATH", out var currentPythonPath)
                ? currentPythonPath
                : null;

            startInfo.Environment["PYTHONPATH"] = string.IsNullOrWhiteSpace(existingPythonPath)
                ? pythonPackagesPath
                : $"{pythonPackagesPath}{Path.PathSeparator}{existingPythonPath}";
        }
        else
        {
            _logger.LogInformation(
                "Configured Python packages path does not exist; continuing without PYTHONPATH override: {PythonPackagesPath}",
                pythonPackagesPath);
        }

        startInfo.Environment["PYTHONUNBUFFERED"] = "1";

        using var process = new Process { StartInfo = startInfo };
        var stdout = new StringBuilder();
        var stderr = new StringBuilder();

        process.OutputDataReceived += (_, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                stdout.AppendLine(e.Data);
        };

        process.ErrorDataReceived += (_, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                stderr.AppendLine(e.Data);
        };

        var startedAt = DateTimeOffset.UtcNow;

        if (!process.Start())
            throw new InvalidOperationException("Failed to start donor churn inference process.");

        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        try
        {
            await process.WaitForExitAsync(linkedCts.Token);
        }
        catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
        {
            try
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
            catch (Exception killEx)
            {
                _logger.LogWarning(killEx, "Failed to kill timed-out donor churn inference process.");
            }

            throw new TimeoutException(
                $"Donor churn inference exceeded timeout of {_options.TimeoutSeconds} seconds.");
        }

        var finishedAt = DateTimeOffset.UtcNow;
        var exitCode = process.ExitCode;
        var output = stdout.ToString().Trim();
        var error = stderr.ToString().Trim();

        if (exitCode != 0)
        {
            _logger.LogWarning(
                "Donor churn inference failed with exit code {ExitCode}. stderr: {StandardError}",
                exitCode,
                error);
        }

        return new DonorChurnRunResult(
            Success: exitCode == 0,
            ExitCode: exitCode,
            StartedAtUtc: startedAt,
            FinishedAtUtc: finishedAt,
            StandardOutput: output,
            StandardError: error
        );
    }

    private static string ResolvePath(string path, string basePath)
    {
        if (Path.IsPathRooted(path))
            return path;

        return Path.GetFullPath(Path.Combine(basePath, path));
    }

    private static string ResolveExecutablePath(string path, string basePath)
    {
        // Allow command names like "python3" for Linux container PATH lookup.
        if (!IsPathLike(path))
            return path;

        return ResolvePath(path, basePath);
    }

    private static bool IsPathLike(string value)
        => value.Contains('/') || value.Contains('\\') || Path.IsPathRooted(value);
}
