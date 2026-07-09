namespace AngryMonkey.CloudMate;

public class MateConfigJsOptions
{
    public string? OutDirSuffix { get; set; }

    public bool Minify { get; set; } = true;

    public bool SourceMap { get; set; } = true;

    public bool Declaration { get; set; } = true;

    public bool WebClean { get; set; } = false;
}
