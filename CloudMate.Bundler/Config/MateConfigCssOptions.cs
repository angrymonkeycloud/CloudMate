namespace AngryMonkey.CloudMate;

public class MateConfigCssOptions
{
    public string? OutDirSuffix { get; set; }

    public bool Minify { get; set; } = true;

    public bool SourceMap { get; set; } = false;
}
