using System;
using System.Linq;
using System.Collections.Generic;

namespace AngryMonkey.CloudMate;

public partial class CoreCSharp
{
    public static string Format(string content)
    {
        content = LineSpacing(content);
        content = Indentation(content);

        return content;
    }
}