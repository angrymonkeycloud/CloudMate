namespace AngryMonkey.CloudMate.Tests;

public class GlobResolverTests
{
    [Fact]
    public void IsMatch_MatchesOnlyTheConfiguredInputPattern()
    {
        using TempDirectory dir = new();
        string configured = dir.WriteFile(Path.Combine("src", "app.js"), "console.log(1);");
        string unrelated = dir.WriteFile(Path.Combine("src", "other.js"), "console.log(2);");

        Assert.True(GlobResolver.IsMatch("src/app.js", dir.Path, configured));
        Assert.False(GlobResolver.IsMatch("src/app.js", dir.Path, unrelated));
        Assert.True(GlobResolver.IsMatch("src/**/*.js", dir.Path, unrelated));
    }

    [Fact]
    public void Resolve_LiteralPath_ReturnsFullPathWhenFileExists()
    {
        using TempDirectory dir = new();
        string filePath = dir.WriteFile("src/app.ts", "const x = 1;");

        List<string> result = GlobResolver.Resolve(["src/app.ts"], dir.Path);

        Assert.Equal([Path.GetFullPath(filePath)], result);
    }

    [Fact]
    public void Resolve_LiteralPath_ReturnsEmptyWhenFileMissing()
    {
        using TempDirectory dir = new();

        List<string> result = GlobResolver.Resolve(["src/missing.ts"], dir.Path);

        Assert.Empty(result);
    }

    [Fact]
    public void Resolve_GlobPattern_MatchesMultipleFilesSortedOrdinally()
    {
        using TempDirectory dir = new();
        dir.WriteFile("src/b.ts", "b");
        dir.WriteFile("src/a.ts", "a");
        dir.WriteFile("src/c.txt", "c");

        List<string> result = GlobResolver.Resolve(["src/*.ts"], dir.Path);

        Assert.Equal(2, result.Count);
        Assert.EndsWith("a.ts", result[0]);
        Assert.EndsWith("b.ts", result[1]);
    }

    [Fact]
    public void Resolve_NormalizesLeadingDotSlash()
    {
        using TempDirectory dir = new();
        string filePath = dir.WriteFile("app.ts", "content");

        List<string> result = GlobResolver.Resolve(["./app.ts"], dir.Path);

        Assert.Equal([Path.GetFullPath(filePath)], result);
    }

    [Fact]
    public void Resolve_DeduplicatesOverlappingPatterns()
    {
        using TempDirectory dir = new();
        dir.WriteFile("src/app.ts", "content");

        List<string> result = GlobResolver.Resolve(["src/app.ts", "src/*.ts"], dir.Path);

        Assert.Single(result);
    }

    [Fact]
    public void Resolve_MultiplePatterns_CombinesResults()
    {
        using TempDirectory dir = new();
        dir.WriteFile("src/app.ts", "content");
        dir.WriteFile("styles/app.css", "content");

        List<string> result = GlobResolver.Resolve(["src/app.ts", "styles/app.css"], dir.Path);

        Assert.Equal(2, result.Count);
    }

    [Theory]
    [InlineData("src/*.ts", true)]
    [InlineData("src/app.ts", false)]
    [InlineData("src/app?.ts", true)]
    public void IsGlob_DetectsWildcardCharacters(string pattern, bool expected)
    {
        Assert.Equal(expected, GlobResolver.IsGlob(pattern));
    }

    [Fact]
    public void GetBaseDirectory_ReturnsDeepestLiteralDirectory()
    {
        using TempDirectory dir = new();

        string baseDirectory = GlobResolver.GetBaseDirectory("src/components/*.ts", dir.Path);

        Assert.Equal(Path.GetFullPath(Path.Combine(dir.Path, "src", "components")), baseDirectory);
    }

    [Fact]
    public void GetBaseDirectory_ReturnsRootWhenGlobIsAtTopLevel()
    {
        using TempDirectory dir = new();

        string baseDirectory = GlobResolver.GetBaseDirectory("*.ts", dir.Path);

        Assert.Equal(Path.GetFullPath(dir.Path), baseDirectory);
    }
}
