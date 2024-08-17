using System;
using System.Linq;
using System.Collections.Generic;
using System.Text;

namespace AngryMonkey.CloudMate;

public partial class CoreCSharp
{
    public static string NewLine()
    {
        return string.Empty;
    }
}

public class CoreCSharpClass
{
    public string Name { get; set; }
    public string[] Usings { get; set; } = [];

    public CoreCSharpClass(string name)
    {
        Name = name;
    }
}

public class CoreCSharpSwitch
{
    public string Value { get; set; }
    public CoreCSharpSwitchCase[] Cases { get; set; } = [];
    public CoreCSharpSwitchDefault Default { get; set; }

    public CoreCSharpSwitch()
    {
        Cases = [];
    }

    public void AddCase(CoreCSharpSwitchCase switchCase)
    {
        List<CoreCSharpSwitchCase> cases = new(Cases)
        {
            switchCase
        };

        Cases = [.. cases];
    }

    public void AddDefault(CoreCSharpSwitchDefault switchDefault)
    {
        Default = switchDefault;
    }

    public string[] ToStatements()
    {
        List<string> outStatements =
        [
            $"switch ({Value})",
            "{"
        ];

        for (int i = 0; i < Cases.Length; i++)
            outStatements.Add(Cases[i].ToString());

        if (Default != null)
            outStatements.Add(Default.ToString());

        outStatements.Add("}");

        return [.. outStatements];

    }

    public override string ToString()
    {
        StringBuilder builder = new();

        foreach (string statement in ToStatements())
            builder.AppendLine(statement);

        return builder.ToString();
    }
}

public class CoreCSharpSwitchCase
{
    public string Condition { get; set; }
    public string[] Statements { get; set; } = [];

    public CoreCSharpSwitchCase()
    {
        Statements = [];
    }

    public void AddStatement(string statement)
    {
        List<string> statements = new(Statements)
        {
            statement
        };

        Statements = [.. statements];
    }

    public void AddStatements(string[] statements)
    {
        foreach (string statement in statements)
            AddStatement(statement);
    }

    public string[] ToStatements()
    {
        List<string> outStatements =
        [
            $"case {Condition}:",
            "{",
            .. Statements,
            "break;",
            "}",
        ];

        return [.. outStatements];
    }

    public override string ToString()
    {
        StringBuilder builder = new();

        foreach (string statement in ToStatements())
            builder.AppendLine(statement);

        return builder.ToString();
    }
}

public class CoreCSharpSwitchDefault
{
    public string[] Statements { get; set; }

    public CoreCSharpSwitchDefault()
    {
        Statements = [];
    }

    public void AddStatement(string statement)
    {
        List<string> statements = new(Statements)
        {
            statement
        };

        Statements = [.. statements];
    }

    public void AddStatements(string[] statements)
    {
        foreach (string statement in statements)
            AddStatement(statement);
    }

    public string[] ToStatements()
    {
        List<string> outStatements =
        [
            "default:"
        ];

        if (Statements.Length == 0)
            outStatements.Add("break;");
        else
        {
            outStatements.Add("{");

            foreach (string statement in Statements)
                outStatements.Add(statement);

            outStatements.Add("break;");
            outStatements.Add("}");
        }

        return [.. outStatements];
    }

    public override string ToString()
    {
        StringBuilder builder = new();

        foreach (string statement in ToStatements())
            builder.AppendLine(statement);

        return builder.ToString();
    }
}

public class CoreCSharpIfCondition
{
    public string Condition { get; set; }
    public string[] Statements { get; set; }
    public bool IsElseIf { get; set; } = false;

    public CoreCSharpIfCondition()
    {
        Statements = [];
    }

    public void AddStatement(string statement)
    {
        List<string> statements = new(Statements)
        {
            statement
        };

        Statements = [.. statements];
    }

    public void AddStatements(string[] statements)
    {
        foreach (string statement in statements)
            AddStatement(statement);
    }

    public string[] ToStatements()
    {
        List<string> outStatements =
        [
            $"{(IsElseIf ? "else if" : "if")} ({Condition})"
        ];

        if (Statements.Length == 1)
            outStatements.Add(Statements[0]);
        else
        {
            outStatements.Add("{");

            foreach (string statement in Statements)
                outStatements.Add(statement);

            outStatements.Add("}");
        }

        return [.. outStatements];
    }

    public override string ToString()
    {
        StringBuilder builder = new();

        foreach (string statement in ToStatements())
            builder.AppendLine(statement);

        return builder.ToString();
    }
}

public class CoreCSharpElseCondition
{
    public string Condition { get; set; }
    public string[] Statements { get; set; }

    public CoreCSharpElseCondition()
    {
        Statements = [];
    }

    public void AddStatement(string statement)
    {
        List<string> statements = new(Statements)
        {
            statement
        };

        Statements = [.. statements];
    }

    public void AddStatements(string[] statements)
    {
        foreach (string statement in statements)
            AddStatement(statement);
    }

    public string[] ToStatements()
    {
        List<string> outStatements = [!string.IsNullOrEmpty(Condition) ? $"else ({Condition})" : "else"];

        if (Statements.Length == 1)
            outStatements.Add(Statements[0]);
        else
        {
            outStatements.Add("{");

            foreach (string statement in Statements)
                outStatements.Add(statement);

            outStatements.Add("}");
        }

        return [.. outStatements];
    }

    public override string ToString()
    {
        StringBuilder builder = new();

        foreach (string statement in ToStatements())
            builder.AppendLine(statement);

        return builder.ToString();
    }
}