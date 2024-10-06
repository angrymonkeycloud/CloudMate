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
        _ => "Microsoft.NET.Sdk",
    };

    public static string GenerateProject(ProjectConfiguration config)
    {
        StringBuilder sb = new();

        sb.AppendLine($"<Project Sdk=\"{GetSdkValue(config.SDK)}\">");

        sb.AppendLine(string.Empty); // New line

        sb.AppendLine(" <PropertyGroup>");
        sb.AppendLine($"     <TargetFramework>{config.TargetFramework}</TargetFramework>");
        sb.AppendLine("     <ImplicitUsings>enable</ImplicitUsings>");
        sb.AppendLine("     <Nullable>enable</Nullable>");
        sb.AppendLine(" </PropertyGroup>");

        // NuGet Packages

        if (config.Packages.Count != 0)
        {
            sb.AppendLine(string.Empty); // New line

            sb.AppendLine("  <ItemGroup>");

            foreach (ProjectPackageReference package in config.Packages)
                sb.AppendLine($"    <PackageReference Include=\"{package.Name}\" Version=\"{package.Version}\" />");

            sb.AppendLine("  </ItemGroup>");
        }

        // Non NuGet Packages

        if (config.Projects.Count != 0)
        {
            sb.AppendLine(string.Empty); // New line

            sb.AppendLine("  <ItemGroup>");

            foreach (ProjectReference project in config.Projects)
                sb.AppendLine($"    <PackageReference Include=\"{project.Name}\" />");

            sb.AppendLine("  </ItemGroup>");
        }

        sb.AppendLine(string.Empty); // New line

        sb.AppendLine("</Project>");

        return sb.ToString();
    }
}
