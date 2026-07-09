namespace AngryMonkey.CloudMate;

public class MateConfigBuild
{
    public string Name { get; set; } = "dev";

    public string? OutDir { get; set; }

    public bool OutDirVersioning { get; set; } = false;

    public bool OutDirName { get; set; } = false;

    public MateConfigCssOptions Css { get; set; } = new();

    public MateConfigJsOptions Js { get; set; } = new();

    /// <summary>Path to the tsconfig.json used for TypeScript compilation. Auto-detected when omitted.</summary>
    public string? Ts { get; set; }

    public MateConfigBuild() { }

    public MateConfigBuild(string name) => Name = name;
}
