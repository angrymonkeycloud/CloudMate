using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AngryMonkey.CloudMate;

public partial class CloudCode
{
    private static string GetSdkValue(ProjectSDKs sdk) => sdk switch
    {
        ProjectSDKs.Web => "Microsoft.NET.Sdk.Web",
        ProjectSDKs.Razor => "Microsoft.NET.Sdk.Razor",
        ProjectSDKs.Worker => "Microsoft.NET.Sdk.Worker",
        ProjectSDKs.BlazorWebAssembly => "Microsoft.NET.Sdk.BlazorWebAssembly",
        _ => "Microsoft.NET.Sdk",
    };

    public static string GenerateProject(ProjectConfiguration config)
    {
        StringBuilder sb = new();

        sb.AppendLine($"<Project Sdk=\"{GetSdkValue(config.SDK)}\">");

        sb.AppendLine(string.Empty); // New line

        sb.AppendLine("\t<PropertyGroup>");

        if (config.SDK == ProjectSDKs.Executable)
            sb.AppendLine("<OutputType>Exe</OutputType>");

        sb.AppendLine($"\t\t<TargetFramework>{config.TargetFramework}</TargetFramework>");
        sb.AppendLine("\t\t<ImplicitUsings>enable</ImplicitUsings>");
        sb.AppendLine("\t\t<Nullable>enable</Nullable>");
        sb.AppendLine("\t</PropertyGroup>");

        List<ProjectPackageReference> packages = [.. config.References.OfType<ProjectPackageReference>()];
        List<ProjectLocalReference> locals = [.. config.References.OfType<ProjectLocalReference>()];

        // NuGet Package References
        if (packages.Count != 0)
            sb.AppendLine(GenerateReferences(packages));

        // Local References
        if (locals.Count != 0)
            sb.AppendLine(GenerateReferences(locals));

        sb.AppendLine("</Project>");

        return sb.ToString();
    }

    private static string GenerateReferences(IEnumerable<ProjectReference> references)
    {
        StringBuilder sb = new();

        sb.AppendLine(string.Empty); // New line

        sb.AppendLine("\t<ItemGroup>");

        foreach (ProjectReference reference in references)
            sb.Append(GenerateReference(reference));

        sb.AppendLine("\t</ItemGroup>");

        return sb.ToString();
    }

    private static string GenerateReference(ProjectReference reference)
    {
        StringBuilder sb = new();

        ProjectPackageReference? package = reference as ProjectPackageReference;

        List<string> attributes = [$"Include=\"{reference.Name}\""];

        if (package != null)
            attributes.Add($"Version=\"{package.Version}\"");

        if (reference.PrivateAssets is not null)
            attributes.Add($"PrivateAssets=\"{reference.PrivateAssets}\"");

        string? attributesString = attributes.Count > 0 ? $"{string.Join(" ", attributes)}" : null;

        string tagName = package != null ? "PackageReference" : "ProjectReference";

        sb.AppendLine($"\t\t<{tagName} {attributesString}{(reference.Pack ? " />" : ">")}");

        if (!reference.Pack)
        {
            sb.AppendLine("\t\t\t<Pack>false</Pack>");

            sb.AppendLine($"\t\t</{tagName}>");
        }

        return sb.ToString();
    }
}
