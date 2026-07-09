using SkiaSharp;

namespace AngryMonkey.CloudMate.Tests;

public class MateImageCompressorTests
{
    private static void WritePng(string path, int width, int height, SKColor color)
    {
        using SKBitmap bitmap = new(width, height);

        using (SKCanvas canvas = new(bitmap))
            canvas.Clear(color);

        using SKData data = bitmap.Encode(SKEncodedImageFormat.Png, 100);
        using FileStream stream = File.Create(path);
        data.SaveTo(stream);
    }

    private static (int Width, int Height) GetImageDimensions(string path)
    {
        using SKBitmap bitmap = SKBitmap.Decode(path) ?? throw new InvalidDataException($"Could not decode {path}");
        return (bitmap.Width, bitmap.Height);
    }

    [Fact]
    public void Execute_ImageLargerThanMaxBounds_ResizesPreservingAspectRatio()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        WritePng(dir.Combine("photo.png"), 200, 100, SKColors.Red);

        MateConfig config = MateConfig.Get(dir.Path);
        config.Images =
        [
            new MateConfigImage
            {
                Input = ["photo.png"],
                Output = ["dist"],
                MaxWidth = 100,
                MaxHeight = 100
            }
        ];

        MateImageCompressor.Execute(config);

        string outputPath = dir.Combine("dist/photo.png");
        Assert.True(File.Exists(outputPath));

        (int width, int height) = GetImageDimensions(outputPath);
        Assert.Equal(100, width);
        Assert.Equal(50, height);
    }

    [Fact]
    public void Execute_ImageSmallerThanMaxBounds_DoesNotEnlarge()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        WritePng(dir.Combine("small.png"), 50, 50, SKColors.Green);

        MateConfig config = MateConfig.Get(dir.Path);
        config.Images =
        [
            new MateConfigImage
            {
                Input = ["small.png"],
                Output = ["dist"],
                MaxWidth = 200,
                MaxHeight = 200
            }
        ];

        MateImageCompressor.Execute(config);

        string outputPath = dir.Combine("dist/small.png");
        Assert.True(File.Exists(outputPath));

        (int width, int height) = GetImageDimensions(outputPath);
        Assert.Equal(50, width);
        Assert.Equal(50, height);
    }

    [Fact]
    public void Execute_WithOutputFormat_ConvertsExtensionAndEncoding()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        WritePng(dir.Combine("photo.png"), 60, 60, SKColors.Blue);

        MateConfig config = MateConfig.Get(dir.Path);
        config.Images =
        [
            new MateConfigImage
            {
                Input = ["photo.png"],
                Output = ["dist"],
                OutputFormat = "jpg"
            }
        ];

        MateImageCompressor.Execute(config);

        string outputPath = dir.Combine("dist/photo.jpg");
        Assert.True(File.Exists(outputPath));
        Assert.False(File.Exists(dir.Combine("dist/photo.png")));

        byte[] bytes = File.ReadAllBytes(outputPath);
        Assert.True(bytes.Length > 2 && bytes[0] == 0xFF && bytes[1] == 0xD8, "Output file should start with the JPEG signature.");
    }

    [Fact]
    public void Execute_CalledTwice_SkipsExistingOutputWithoutOverride()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        string sourcePath = dir.Combine("photo.png");
        WritePng(sourcePath, 50, 50, SKColors.Red);

        MateConfig config = MateConfig.Get(dir.Path);
        config.Images =
        [
            new MateConfigImage
            {
                Input = ["photo.png"],
                Output = ["dist"]
            }
        ];

        MateImageCompressor.Execute(config);

        string outputPath = dir.Combine("dist/photo.png");
        byte[] firstRun = File.ReadAllBytes(outputPath);

        // Overwrite the source with different dimensions/color; since the output already
        // exists, a non-overriding Execute() call should leave it untouched.
        WritePng(sourcePath, 80, 80, SKColors.Blue);
        MateImageCompressor.Execute(config);

        byte[] secondRun = File.ReadAllBytes(outputPath);
        Assert.Equal(firstRun, secondRun);
    }

    [Fact]
    public void Delete_RemovesCorrespondingOutputFile()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        string sourcePath = dir.Combine("photo.png");
        WritePng(sourcePath, 40, 40, SKColors.Yellow);

        MateConfig config = MateConfig.Get(dir.Path);
        MateConfigImage imageConfig = new()
        {
            Input = ["photo.png"],
            Output = ["dist"]
        };
        config.Images = [imageConfig];

        MateImageCompressor.Execute(config);

        string outputPath = dir.Combine("dist/photo.png");
        Assert.True(File.Exists(outputPath));

        MateImageCompressor.Delete(config, imageConfig, sourcePath);

        Assert.False(File.Exists(outputPath));
    }

    [Fact]
    public void Execute_SvgInput_WritesMinifiedSvgWithoutCommentsOrExtraWhitespace()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("icon.svg", "<svg>\n  <!-- a comment -->\n  <rect />\n</svg>\n");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Images =
        [
            new MateConfigImage
            {
                Input = ["icon.svg"],
                Output = ["dist"]
            }
        ];

        MateImageCompressor.Execute(config);

        string outputPath = dir.Combine("dist/icon.svg");
        Assert.True(File.Exists(outputPath));

        string content = File.ReadAllText(outputPath);
        Assert.DoesNotContain("<!--", content);
        Assert.DoesNotContain("a comment", content);
        Assert.DoesNotContain("\n", content);
        Assert.Contains("<svg>", content);
        Assert.Contains("<rect", content);
        Assert.Contains("</svg>", content);
    }
}
