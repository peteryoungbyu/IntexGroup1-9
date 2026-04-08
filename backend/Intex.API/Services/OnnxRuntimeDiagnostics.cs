using Microsoft.ML.OnnxRuntime;
using Microsoft.Extensions.Logging;
using System.Runtime.InteropServices;
using System.Text;

namespace Intex.API.Services;

public static class OnnxRuntimeDiagnostics
{
    public static InferenceSession CreateCpuOnlySession(string modelPath, ILogger logger, string pipelineName)
    {
        var options = new Microsoft.ML.OnnxRuntime.SessionOptions
        {
            GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_BASIC,
            ExecutionMode = ExecutionMode.ORT_SEQUENTIAL,
            InterOpNumThreads = 1,
            IntraOpNumThreads = 1,
            EnableCpuMemArena = false,
            EnableMemoryPattern = false,
            LogSeverityLevel = OrtLoggingLevel.ORT_LOGGING_LEVEL_WARNING,
            LogVerbosityLevel = 0,
        };

        options.AppendExecutionProvider_CPU(0);

        logger.LogInformation(
            "Initializing ONNX Runtime with CPU provider. Pipeline={Pipeline}, ProcessArch={ProcessArch}, OSArch={OsArch}, ModelPath={ModelPath}",
            pipelineName,
            RuntimeInformation.ProcessArchitecture,
            RuntimeInformation.OSArchitecture,
            modelPath);

        return new InferenceSession(modelPath, options);
    }

    public static string GetRuntimeDiagnostics()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "onnxruntime.dll"),
            Path.Combine(AppContext.BaseDirectory, "runtimes", "win-x64", "native", "onnxruntime.dll"),
            Path.Combine(AppContext.BaseDirectory, "runtimes", "win-arm64", "native", "onnxruntime.dll"),
            Path.Combine(AppContext.BaseDirectory, "runtimes", "win-x86", "native", "onnxruntime.dll"),
        };

        var sb = new StringBuilder();
        sb.Append($"OS={RuntimeInformation.OSDescription}; ");
        sb.Append($"ProcessArch={RuntimeInformation.ProcessArchitecture}; ");
        sb.Append($"OSArch={RuntimeInformation.OSArchitecture}; ");
        sb.Append($"BaseDir={AppContext.BaseDirectory}; ");
        sb.Append($"CurrentDir={Environment.CurrentDirectory}; ");
        sb.Append($"OnnxAssembly={typeof(InferenceSession).Assembly.Location}; ");

        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        var pathPreview = string.Join(';', path.Split(';', StringSplitOptions.RemoveEmptyEntries).Take(8));
        sb.Append($"PathPreview={pathPreview}; ");

        var nativeFiles = candidates
            .Select(path => $"{path}:{(File.Exists(path) ? "exists" : "missing")}");
        sb.Append($"NativeCandidates=[{string.Join(", ", nativeFiles)}]");

        return sb.ToString();
    }

    public static string BuildDetailedExceptionMessage(Exception ex)
    {
        var sb = new StringBuilder();
        var current = ex;
        var depth = 0;

        while (current != null && depth < 6)
        {
            sb.Append($"[{depth}] {current.GetType().FullName}: {current.Message}");
            if (!string.IsNullOrWhiteSpace(current.StackTrace))
            {
                sb.AppendLine();
                sb.Append(current.StackTrace);
            }

            current = current.InnerException;
            depth++;

            if (current != null)
            {
                sb.AppendLine();
                sb.Append(" ---> ");
            }
        }

        return sb.ToString();
    }
}
