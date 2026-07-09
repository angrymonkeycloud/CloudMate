using System.Text.RegularExpressions;
using SkiaSharp;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Image compression pipeline using SkiaSharp. Port of the legacy compressor.ts (imagemin + sharp):
/// resizes to max bounds (never enlarging), optionally converts format, re-encodes with compression,
/// and keeps the original when re-encoding grows the file.
/// </summary>
public static class MateImageCompressor
{
    public static Action<string> Log { get; set; } = Console.WriteLine;
    public static Action<string> LogError { get; set; } = Console.Error.WriteLine;

    private static readonly string[] SupportedRasterExtensions = ["png", "jpeg", "jpg", "gif", "webp"];

    private sealed class ImageQueueItem
    {
        public required string FilePath { get; init; }
        public required string Destination { get; init; }
        public required string OutputFileName { get; init; }
        public required MateConfigImage Config { get; init; }
        public required long OldSize { get; init; }
    }

    private static readonly object _lock = new();
    private static readonly Queue<ImageQueueItem> _queue = [];
    private static bool _compressionInProgress;

    /// <summary>Processes all image entries in the configuration. Mirrors legacy MateCompressor.execute.</summary>
    public static void Execute(MateConfig config)
    {
        if (config.Images is null)
            return;

        foreach (MateConfigImage image in config.Images)
            QueueImages(config, image);

        CompressImages();
    }

    /// <summary>Queues all matched inputs of an image entry. Existing outputs are skipped unless <paramref name="override"/>.</summary>
    public static void QueueImages(MateConfig config, MateConfigImage imageConfig, bool @override = false)
    {
        foreach (string output in imageConfig.Output)
            foreach (string input in imageConfig.Input)
            {
                string baseDirectory = GetBaseDirectory(config, input);

                foreach (string file in GlobResolver.Resolve([input], config.RootDirectory))
                {
                    string extension = Path.GetExtension(file).TrimStart('.').ToLowerInvariant();

                    if (extension != "svg" && !SupportedRasterExtensions.Contains(extension))
                        continue;

                    string destination = ResolveDestination(config, output, baseDirectory, file);
                    string outputFileName = GetOutputFileName(imageConfig, file);
                    string destinationPath = Path.Combine(destination, outputFileName);

                    if (!@override && File.Exists(destinationPath))
                        continue;

                    lock (_lock)
                    {
                        if (_queue.Any(item => string.Equals(item.FilePath, file, StringComparison.OrdinalIgnoreCase)))
                            continue;

                        _queue.Enqueue(new ImageQueueItem
                        {
                            FilePath = file,
                            Destination = destination,
                            OutputFileName = outputFileName,
                            Config = imageConfig,
                            OldSize = new FileInfo(file).Length
                        });
                    }
                }
            }
    }

    /// <summary>Drains the queue, compressing one image at a time. Safe to call from watcher events.</summary>
    public static void CompressImages()
    {
        lock (_lock)
        {
            if (_compressionInProgress)
                return;

            _compressionInProgress = true;
        }

        try
        {
            while (true)
            {
                ImageQueueItem item;

                lock (_lock)
                {
                    if (_queue.Count == 0)
                        return;

                    item = _queue.Dequeue();
                }

                try
                {
                    Compress(item);
                }
                catch (Exception ex)
                {
                    LogError($"  {item.FilePath}: {ex.Message}");
                }
            }
        }
        finally
        {
            lock (_lock)
                _compressionInProgress = false;
        }
    }

    /// <summary>Deletes the output that corresponds to a removed source file. Mirrors legacy MateCompressor.delete.</summary>
    public static void Delete(MateConfig config, MateConfigImage imageConfig, string filePath)
    {
        foreach (string output in imageConfig.Output)
            foreach (string input in imageConfig.Input)
            {
                string baseDirectory = GetBaseDirectory(config, input);
                string destination = ResolveDestination(config, output, baseDirectory, Path.GetFullPath(filePath));
                string fileToDelete = Path.Combine(destination, GetOutputFileName(imageConfig, filePath));

                if (File.Exists(fileToDelete))
                    File.Delete(fileToDelete);
            }
    }

    private static void Compress(ImageQueueItem item)
    {
        Directory.CreateDirectory(item.Destination);

        string destinationPath = Path.Combine(item.Destination, item.OutputFileName);
        string sourceExtension = Path.GetExtension(item.FilePath).TrimStart('.').ToLowerInvariant();

        if (sourceExtension == "svg")
        {
            File.WriteAllText(destinationPath, MinifySvg(File.ReadAllText(item.FilePath)));
            Log($"  {item.FilePath} -> {destinationPath}");
            return;
        }

        byte[] sourceBytes = File.ReadAllBytes(item.FilePath);

        using SKBitmap bitmap = SKBitmap.Decode(sourceBytes)
            ?? throw new InvalidDataException($"Could not decode image: {item.FilePath}");

        // Resize if dimensions exceed the configured maximums, preserving aspect ratio.
        SKBitmap resized = Resize(bitmap, item.Config.MaxWidth, item.Config.MaxHeight);

        string targetExtension = item.Config.OutputFormat?.ToLowerInvariant() ?? sourceExtension;
        SKEncodedImageFormat format = GetFormat(targetExtension);
        int quality = GetQuality(targetExtension);

        using SKData encoded = resized.Encode(format, quality);

        // Keep-smaller: when not changing format, prefer the original if re-encoding grew the file.
        if (item.Config.OutputFormat is null && encoded.Size > item.OldSize)
            File.Copy(item.FilePath, destinationPath, overwrite: true);
        else
            File.WriteAllBytes(destinationPath, encoded.ToArray());

        if (!ReferenceEquals(resized, bitmap))
            resized.Dispose();

        Log($"  {item.FilePath} -> {destinationPath}");
    }

    private static SKBitmap Resize(SKBitmap source, int? maxWidth, int? maxHeight)
    {
        if (maxWidth is null && maxHeight is null)
            return source;

        double scaleX = maxWidth is null ? 1.0 : Math.Min(1.0, (double)maxWidth.Value / source.Width);
        double scaleY = maxHeight is null ? 1.0 : Math.Min(1.0, (double)maxHeight.Value / source.Height);
        double scale = Math.Min(scaleX, scaleY);

        if (scale >= 1.0)
            return source;

        int newWidth  = Math.Max(1, (int)Math.Round(source.Width  * scale));
        int newHeight = Math.Max(1, (int)Math.Round(source.Height * scale));

        SKImageInfo info = source.Info.WithSize(newWidth, newHeight);
        SKBitmap resized = new(info);

        source.ScalePixels(resized, SKSamplingOptions.Default);

        return resized;
    }

    private static SKEncodedImageFormat GetFormat(string extension) => extension switch
    {
        "jpg" or "jpeg" => SKEncodedImageFormat.Jpeg,
        "gif"           => SKEncodedImageFormat.Gif,
        "webp"          => SKEncodedImageFormat.Webp,
        _               => SKEncodedImageFormat.Png
    };

    private static int GetQuality(string extension) => extension switch
    {
        "jpg" or "jpeg" => 75,
        "webp"          => 75,
        _               => 100
    };

    private static string MinifySvg(string content)
    {
        content = Regex.Replace(content, "<!--.*?-->", string.Empty, RegexOptions.Singleline);
        content = Regex.Replace(content, ">\\s+<", "><");

        return content.Trim();
    }

    private static string GetBaseDirectory(MateConfig config, string input)
    {
        string fullInput = Path.GetFullPath(Path.Combine(config.RootDirectory, input.Replace('/', Path.DirectorySeparatorChar)));

        if (!GlobResolver.IsGlob(input) && File.Exists(fullInput))
            return Path.GetDirectoryName(fullInput)!;

        return GlobResolver.GetBaseDirectory(input, config.RootDirectory);
    }

    private static string ResolveDestination(MateConfig config, string output, string baseDirectory, string file)
    {
        string destination = Path.GetFullPath(Path.Combine(config.RootDirectory, output.Replace('/', Path.DirectorySeparatorChar)));
        string fileDirectory = Path.GetDirectoryName(file)!;

        if (fileDirectory.Length > baseDirectory.Length
            && fileDirectory.StartsWith(baseDirectory, StringComparison.OrdinalIgnoreCase))
            destination += fileDirectory[baseDirectory.Length..];

        return destination;
    }

    private static string GetOutputFileName(MateConfigImage imageConfig, string file)
    {
        string fileName = Path.GetFileName(file);

        if (imageConfig.OutputFormat is not null)
            fileName = $"{Path.GetFileNameWithoutExtension(fileName)}.{imageConfig.OutputFormat.ToLowerInvariant()}";

        return fileName;
    }
}
