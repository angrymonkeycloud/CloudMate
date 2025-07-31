using System.Text;

namespace AngryMonkey.CloudMate;

public static class ConsoleHelper
{
    static ConsoleHelper()
    {
        // Enable Unicode support for console
        try
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.InputEncoding = Encoding.UTF8;
        }
        catch
        {
            // Fallback if encoding cannot be set
        }
    }

    public static void EnsureConsoleSetup()
    {
        // This method just ensures the static constructor runs
        // Called from the main program to set up console properly
    }
}